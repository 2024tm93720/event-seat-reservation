package com.ticketing.order.repository;

import com.ticketing.order.model.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TicketRepository extends JpaRepository<Ticket, Long> {
    List<Ticket> findByOrder_OrderId(Long orderId);
}
