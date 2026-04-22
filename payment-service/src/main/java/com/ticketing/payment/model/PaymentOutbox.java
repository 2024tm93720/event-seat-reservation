package com.ticketing.payment.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(schema = "payments", name = "payment_outbox")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PaymentOutbox {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long outboxId;

    private Long aggregateId;

    @Column(length = 60, nullable = false)
    private String eventType;

    @Column(columnDefinition = "jsonb", nullable = false)
    private String payload;

    private boolean published = false;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() { this.createdAt = Instant.now(); }
}
