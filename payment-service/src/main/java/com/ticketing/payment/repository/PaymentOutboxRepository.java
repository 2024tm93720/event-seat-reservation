package com.ticketing.payment.repository;

import com.ticketing.payment.model.PaymentOutbox;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PaymentOutboxRepository extends JpaRepository<PaymentOutbox, Long> {
    List<PaymentOutbox> findByPublishedFalse();
}
