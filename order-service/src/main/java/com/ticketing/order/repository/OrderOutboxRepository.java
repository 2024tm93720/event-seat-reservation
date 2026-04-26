package com.ticketing.order.repository;

import com.ticketing.order.model.OrderOutbox;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OrderOutboxRepository extends JpaRepository<OrderOutbox, Long> {
    List<OrderOutbox> findByPublishedFalse();
}
