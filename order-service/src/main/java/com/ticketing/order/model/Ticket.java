// ============================================================
// FILE: model/Ticket.java
// ============================================================
package com.ticketing.order.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(schema = "orders", name = "ticket")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Ticket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long ticketId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    private Long seatId;

    @Column(unique = true, length = 40, nullable = false)
    private String ticketCode;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    private TicketStatus ticketStatus = TicketStatus.ISSUED;

    @Builder.Default
    private Instant issuedAt = Instant.now();
    @Builder.Default
    private Instant updatedAt = Instant.now();

    @PreUpdate
    void onUpdate() { this.updatedAt = Instant.now(); }
}