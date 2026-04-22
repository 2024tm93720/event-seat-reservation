package com.ticketing.order.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@Schema(description = "Aggregate counts across all orders")
public class OrderStatsResponse {

    @Schema(example = "400")
    private long total;

    @Schema(example = "291")
    private long confirmed;

    @Schema(example = "39")
    private long reserved;

    @Schema(example = "55")
    private long paymentFailed;

    @Schema(example = "15")
    private long rejected;

    @Schema(example = "0")
    private long cancelled;

    @Schema(example = "692")
    private long totalTickets;
}
