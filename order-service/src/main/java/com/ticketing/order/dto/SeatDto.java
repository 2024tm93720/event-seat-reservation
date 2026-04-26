package com.ticketing.order.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class SeatDto {
    private Long seatId;
    private String seatLabel;
    private String section;
    private BigDecimal seatPrice;
}
