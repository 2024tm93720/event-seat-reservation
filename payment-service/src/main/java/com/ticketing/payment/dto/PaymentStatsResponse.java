package com.ticketing.payment.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;

@Data
@Builder
@Schema(description = "Aggregate statistics across all payments")
public class PaymentStatsResponse {

    @Schema(description = "Total number of payments", example = "400")
    private long total;

    @Schema(description = "Payments completed successfully", example = "291")
    private long success;

    @Schema(description = "Payments declined by the gateway", example = "70")
    private long failed;

    @Schema(description = "Payments awaiting processing", example = "39")
    private long pending;

    @Schema(description = "Payments that have been refunded", example = "0")
    private long refunded;

    @Schema(description = "Sum of all successful payment amounts", example = "567890.50")
    private BigDecimal totalRevenue;
}
