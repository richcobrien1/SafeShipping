use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::{*, JsValue};
use regex::Regex;
use once_cell::sync::Lazy;
use validator::{Validate, ValidationError, ValidationErrors};

static PHONE_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^\+?[0-9\-]{7,15}$").unwrap()
});

fn format_validation_errors(errors: ValidationErrors) -> String {
    errors
        .field_errors()
        .iter()
        .map(|(field, errs)| {
            let messages: Vec<String> = errs
                .iter()
                .map(|e| e.code.to_string())
                .collect();
            format!("- {}: {}", field, messages.join(", "))
        })
        .collect::<Vec<_>>()
        .join("\n")
}

#[wasm_bindgen]
pub fn create_order_log(order_data: &str) -> String {
    let order: ShippingOrder = match serde_json::from_str(order_data) {
        Ok(o) => o,
        Err(_) => return "Invalid JSON".to_string(),
    };

    if let Err(e) = order.validate() {
        return format!("Validation errors:\n{}", format_validation_errors(e));
    }

    emit_order_created_log(&order);

    format!(
        "📦 {} → {} | Tracking: {}",
        order.sender.name,
        order.recipient.name,
        order.metadata.external_tracking_id
    )
}

#[derive(Serialize, Deserialize, Validate, JsonSchema, Default)]
pub struct Metadata {
    #[validate(length(min = 1))]
    pub external_tracking_id: String,
    pub order_notes: Option<String>,
}

#[derive(Serialize, Deserialize, Validate, JsonSchema, Default)]
pub struct ShippingOrder {
    #[validate]
    pub sender: Contact,

    #[validate]
    pub recipient: Contact,

    #[validate]
    pub package: Package,

    #[validate]
    pub metadata: Metadata,
}

#[derive(Serialize, Deserialize, JsonSchema, Default)]
pub struct Contact {
    pub name: String,
    pub address: String,
    pub contact: String,
}

impl Validate for Contact {
    fn validate(&self) -> Result<(), ValidationErrors> {
        let mut errors = ValidationErrors::new();

        if self.name.trim().is_empty() {
            errors.add("name", ValidationError::new("length"));
        }

        if self.address.trim().is_empty() {
            errors.add("address", ValidationError::new("length"));
        }

        if !PHONE_RE.is_match(&self.contact) {
            errors.add("contact", ValidationError::new("regex"));
        }

        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
        }
    }
}

#[derive(Serialize, Deserialize, Validate, JsonSchema, Default)]
pub struct Package {
    #[validate(range(min = 0.01))]
    pub weight_kg: f32,

    #[validate(length(min = 3, max = 3))]
    pub dimensions_cm: Vec<u32>,

    #[validate(length(min = 3))]
    pub category: String,

    pub insured: bool,
}

fn emit_order_created_log(order: &ShippingOrder) {
    let payload = serde_json::json!({
        "event": "ShippingOrderCreated",
        "sender": order.sender.name,
        "recipient": order.recipient.name,
        "tracking_id": order.metadata.external_tracking_id,
        "insured": order.package.insured,
        "dimensions_cm": order.package.dimensions_cm,
        "weight_kg": order.package.weight_kg,
        "timestamp_utc": chrono::Utc::now().to_rfc3339()
    });

    web_sys::console::log_1(&JsValue::from_str(&payload.to_string()));
}

