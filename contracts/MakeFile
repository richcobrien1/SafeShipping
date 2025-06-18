.PHONY: all build test clean run

CONTRACTS := safeshipping

all: build

build:
	@for dir in $(CONTRACTS); do \
		echo "🔧 Building $$dir..."; \
		wasm-pack build --target nodejs $$dir || exit 1; \
	done

test:
	@for dir in $(CONTRACTS); do \
		if [ -f $$dir/test-event-id.js ]; then \
		echo "🧪 Running test for $$dir..."; \
		node $$dir/test-event-id.js || exit 1; \
	else \
		echo "⚠️ No test file for $$dir"; \
	fi; \
	done

clean:
	@echo "🧹 Cleaning all build artifacts..."
	@cargo clean
	@find . -type d -name "pkg" -exec rm -rf {} +

run: build test
