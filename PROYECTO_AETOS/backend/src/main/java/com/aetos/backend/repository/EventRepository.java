package com.aetos.backend.repository;

import com.aetos.backend.model.Event;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;

public interface EventRepository extends JpaRepository<Event, Long> {
    List<Event> findByFechaGreaterThanEqualOrderByFechaAsc(LocalDate fecha);
}
