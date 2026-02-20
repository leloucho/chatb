package com.aetos.backend.controller;

import com.aetos.backend.model.Event;
import com.aetos.backend.model.Role;
import com.aetos.backend.model.User;
import com.aetos.backend.repository.EventRepository;
import com.aetos.backend.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class EventController {

    private final EventRepository eventRepository;
    private final UserRepository userRepository;

    public EventController(EventRepository eventRepository, UserRepository userRepository) {
        this.eventRepository = eventRepository;
        this.userRepository = userRepository;
    }

    // Get upcoming events (any authenticated user)
    @GetMapping("/events")
    public ResponseEntity<?> getUpcomingEvents() {
        List<Event> events = eventRepository.findByFechaGreaterThanEqualOrderByFechaAsc(LocalDate.now());
        return ResponseEntity.ok(events);
    }

    // Leader or admin creates event
    @PostMapping("/leader/events")
    public ResponseEntity<?> createEvent(@RequestBody Event event, Authentication auth) {
        String email = (String) auth.getPrincipal();
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null || (user.getRol() != Role.LIDER && user.getRol() != Role.ADMIN)) {
            return ResponseEntity.status(403).body(Map.of("error", "Only leader or admin can create events"));
        }

        eventRepository.save(event);
        return ResponseEntity.ok(event);
    }

    // Leader or admin updates event
    @PutMapping("/leader/events/{id}")
    public ResponseEntity<?> updateEvent(@PathVariable Long id, @RequestBody Event eventData, Authentication auth) {
        String email = (String) auth.getPrincipal();
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null || (user.getRol() != Role.LIDER && user.getRol() != Role.ADMIN)) {
            return ResponseEntity.status(403).body(Map.of("error", "Only leader or admin can update events"));
        }

        var eventOpt = eventRepository.findById(id);
        if (eventOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Event event = eventOpt.get();
        event.setTitulo(eventData.getTitulo());
        event.setResponsable(eventData.getResponsable());
        event.setFecha(eventData.getFecha());
        event.setDescripcion(eventData.getDescripcion());
        eventRepository.save(event);
        return ResponseEntity.ok(event);
    }

    // Leader or admin deletes event
    @DeleteMapping("/leader/events/{id}")
    public ResponseEntity<?> deleteEvent(@PathVariable Long id, Authentication auth) {
        String email = (String) auth.getPrincipal();
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null || (user.getRol() != Role.LIDER && user.getRol() != Role.ADMIN)) {
            return ResponseEntity.status(403).body(Map.of("error", "Only leader or admin can delete events"));
        }

        eventRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Event deleted"));
    }
}
