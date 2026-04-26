package com.ticketing.order.repository;

import com.ticketing.order.model.Order;
import com.ticketing.order.model.OrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {

    Optional<Order> findByIdempotencyKey(String idempotencyKey);

    List<Order> findByUserId(Long userId);

    List<Order> findByEventIdAndOrderStatusIn(Long eventId, List<OrderStatus> statuses);

    @Query("SELECT o FROM Order o WHERE o.orderStatus = 'RESERVED'")
    List<Order> findReservedOrders();

    long countByOrderStatus(OrderStatus status);

    Page<Order> findAll(Pageable pageable);

    Page<Order> findByOrderStatus(OrderStatus status, Pageable pageable);
}
