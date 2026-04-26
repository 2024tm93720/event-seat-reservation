package com.ticketing.order.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;

@Entity
@Table(schema = "orders", name = "order_outbox")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class OrderOutbox {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long outboxId;

    private Long aggregateId;

    @Column(length = 60, nullable = false)
    private String eventType;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private String payload;

    @Builder.Default
    private boolean published = false;

    @Builder.Default
    private Instant createdAt = Instant.now();
}
