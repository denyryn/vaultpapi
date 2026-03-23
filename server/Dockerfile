FROM golang:1.21-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o vaultpapi ./cmd/vaultpapi

FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /app

COPY --from=builder /app/vaultpapi .
COPY --from=builder /app/config.yaml .
COPY --from=builder /app/migrations ./migrations

EXPOSE 8080

ENTRYPOINT ["./vaultpapi"]
