BIN_DIR=$(shell pwd)/bin
ENTRY_POINT=$(shell pwd)/cmd/vaultpapi/main.go

migrate:
	@go run $(ENTRY_POINT) -migrate

run:
	@go run $(ENTRY_POINT)

clean:
	@rm -rf $(BIN_DIR)

build: clean
	@echo $(BIN_DIR)
	@mkdir $(BIN_DIR)
	@go build -o $(BIN_DIR) $(ENTRY_POINT)

all: build
