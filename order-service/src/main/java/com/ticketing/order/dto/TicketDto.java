package com.ticketing.order.dto;

import com.ticketing.order.model.TicketStatus;
import lombok.Builder;
import lombok.Data;
import java.time.Instant;

@Data @Builder
public class TicketDto {
    private Long ticketId;
    private Long seatId;
    private String ticketCode;
    private TicketStatus ticketStatus;
    private Instant issuedAt;
}
