package com.ticketing.payment.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@Schema(description = "Error details returned when a request cannot be fulfilled")
public class ErrorResponse {

    @Schema(description = "HTTP status code", example = "404")
    private int status;

    @Schema(description = "Short error category", example = "Not Found")
    private String error;

    @Schema(description = "Human-readable explanation", example = "Payment not found: 99")
    private String message;

    @Schema(description = "Request path that triggered the error", example = "/v1/payments/99")
    private String path;
}
