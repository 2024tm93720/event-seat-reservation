package com.ticketing.payment.repository;

import com.ticketing.payment.model.Refund;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RefundRepository extends JpaRepository<Refund, Long> {
    List<Refund> findByPayment_PaymentId(Long paymentId);
}
