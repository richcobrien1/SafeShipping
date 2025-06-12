# **SafeShipping User Flow**
## 1.	Supplier Origination Flow
### A. Login and Dashboard Access
-	Step 1: Login: The supplier authenticates into the SafeShipping portal using multi-factor authentication.
-	Step 2: Dashboard Landing: Upon login, the supplier is presented with an order management dashboard displaying current orders, status alerts, and a clear "Create New Order" button.
### B. Order Creation Process
-	Step 3: Initiate Order: Supplier clicks on “Create New Order.”
-	Step 4: Enter Order Details:
    -	Pickup Information: Enter warehouse/store address, contact details, and time window for pickup.
    -	Package Information: Provide package details (dimensions, weight, type, special handling instructions).
    -	Destination Details: Input end delivery address(es); if multiple, a list or map overlay may be provided.
-	Step 5: Select Delivery Mode:
    -	Options include delivery via store drop-off, truck, bus, car, or bicycle.
    -	Each option might trigger sub-options (e.g., for bicycles, specify if a courier is available, or for trucks, vehicle size requirements).
### C. Order Confirmation and Notification
-	Step 6: Review and Confirm:
    -	A summary screen displays all entered data including estimated costs, pickup/delivery windows, and environmental notes (if any).
    -	Supplier confirms the order.
-	Step 7: Tracking Number Generation:
    -	The system auto-generates a unique tracking ID.
    -	A workflow status flag is set to “Awaiting Contractor Assignment.”
-	Step 8: Contractor Notification:
    -	Automated alerts (via API integration or internal messaging) notify shipping contractors that a new order is ready for pickup.
### D. Exception Handling (Supplier Side)
-	Step 9: Validation and Corrections:
    -	If mandatory fields are missing or if there’s a conflict (e.g., overlapping pickup slots), the system prompts for corrections.
-	Step 10: Order Cancellation/Modification:
    -	Supplier has an option to modify or cancel an order before contractor assignment.
## **2. Shipping Contractor Flow**
### A. Access and Order Acknowledgment
-	Step 1: Login: Shipping contractor logs into a dedicated contractor portal or mobile app.
-	Step 2: Order Notification:
    -	System displays a live feed of pending orders with details such as pickup location and delivery mode.
    -	Contractors can filter based on transportation mode (e.g., boats, airplanes, trucks, etc.).
### B. Order Acceptance and Pre-Pickup Verification
-	Step 3: Select and Accept Order:
    -	The contractor reviews the order summary and accepts it using a click-to-confirm option.
    -	The accepted order status is updated to “Assigned” and visible to both the supplier and the contractor.
-	Step 4: Pre-Pickup Checklist:
    -	Verify vehicle readiness and suitability for the specific shipping mode (e.g., if shipping by bus or boat, ensure compliance with capacity requirements).
    -	Confirm the availability of any necessary equipment (GPS, mobile scanner for QR codes, etc.).
### C. Pickup and In-Transit Tracking
-	Step 5: Arrival at Supplier Location:
    -	Contractor arrives at the designated pickup location.
    -	Uses a mobile interface to check-in.
-	Step 6: Pickup Verification:
    -	Scan the package’s QR or barcode to verify the tracking ID.
    -	The system captures real-time data: timestamp of pickup, condition of package (option for short comment/photo upload).
    -	Status updates to “In Transit.”
-	Step 7: Transit Updates:
    -	As the shipment moves, the contractor logs automatic updates (via GPS tracking integration) at key checkpoints (e.g., warehouse exit, highway, city entry).
    -	Optionally, a manual update facility is available to note delays, detours, or incidents.
### D. Delivery and Confirmation
-	Step 8: Arrival at Destination:
    -	At the delivery point, the contractor uses the app to mark the arrival.
    -	Depending on the delivery method, either a physical signature is captured (for door-to-door) or a confirmation code is shared with the recipient (for pickup at a store).
-	Step 9: Final Update:
    -	Once delivery is confirmed (via digital signature, photo proof, or customer PIN confirmation), the status updates to “Delivered.”
    -	Automatic notifications are pushed to both supplier and customer adding a time-stamped log.
### E. Exception Handling (Contractor Side)
-	Step 10: Handling Shipping Delays or Issues:
    -	If an unexpected delay occurs (e.g., vehicle breakdown), the contractor marks the order accordingly, enters the reason, and the system triggers an alert to suppliers and customers.
-	Step 11: Multiple Drops/Stops:
    -	For shipments with multiple destinations, each stop is logged individually.
    -	The contractor should use the mobile app to navigate and confirm each delivery before moving to the next.
## **3. Customer End-User Flow**
### A. Tracking Initiation and Validation
-	Step 1: Receive Tracking Info:
    -	Customers receive an email or SMS with a unique tracking number and a link to the tracking page.
-	Step 2: Access Tracking Portal:
    -	Customer visits the tracking page—this can be a seamless web UI or mobile interface.
-	Step 3: Enter Tracking Number:
    -	Customer enters the tracking ID.
    -	The system validates this entry and retrieves order information.
### B. Order Status and Details Display
-	Step 4: Display Tracking Timeline:
    -	A dynamic timeline shows key stages: Order Created, Assigned to Contractor, Picked Up, In Transit, Out for Delivery, Delivered (or Ready for Pickup).
    -	Visual cues (like icons for trucks, bicycles, etc.) indicate the shipping method at each stage.
-	Step 5: Detailed Status View:
    -	Clicking on any stage expands additional details: timestamps, current location (using map integration), next expected update, and any relevant notes.
-	Step 6: Pickup vs. Direct Delivery Instructions:
    -	If the order is designated for pickup at a store, the system highlights the pickup location, store hours, and any identification needed.
    -	For direct deliveries, the portal confirms the delivery window and allows acknowledgment upon receipt.
### C. Customer Support and Additional Features
-	Step 7: Real-Time Notifications:
    -	Customers can opt-in or modify alerts for SMS/email updates for each status change.
-	Step 8: Feedback and Support Access:
    -	An integrated support chat or FAQ section is available if the customer has questions about delays or if the package isn’t delivered on schedule.
-	Step 9: Post-Delivery Engagement:
    -	Once confirmed delivered, customers might be prompted to rate the experience and leave feedback.
-	Step 10: Interactive Map and Route Overview:
    -	For a more engaging experience, an interactive map may display the current route of the shipment if available, giving an estimated time-of-arrival update