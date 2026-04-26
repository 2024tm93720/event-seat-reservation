package com.ticketing.order.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
@Schema(description = "Seat line-item within an order")
public class OrderSeatDto {

    @Schema(example = "101")
    private Long seatId;

    @Schema(example = "A12")
    private String seatLabel;

    @Schema(example = "VIP")
    private String section;

    @Schema(example = "150.00")
    private BigDecimal seatPrice;
}
