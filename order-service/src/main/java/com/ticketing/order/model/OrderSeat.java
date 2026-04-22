// ============================================================
// FILE: model/OrderSeat.java
// ============================================================
package com.ticketing.order.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(schema = "orders", name = "order_seat")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class OrderSeat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long orderSeatId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    private Long seatId;        // cross-service ref
    private String seatLabel;
    private String section;

    @Column(precision = 10, scale = 2, nullable = false)
    private BigDecimal seatPrice;

    @Builder.Default
    private Instant createdAt = Instant.now();
}