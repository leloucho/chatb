package com.aetos.backend.controller;

import com.aetos.backend.model.Location;
import com.aetos.backend.model.Role;
import com.aetos.backend.model.User;
import com.aetos.backend.repository.LocationRepository;
import com.aetos.backend.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class LocationController {

    private final LocationRepository locationRepository;
    private final UserRepository userRepository;

    public LocationController(LocationRepository locationRepository, UserRepository userRepository) {
        this.locationRepository = locationRepository;
        this.userRepository = userRepository;
    }

    // Get all locations (any authenticated user)
    @GetMapping("/locations")
    public ResponseEntity<?> getAllLocations() {
        List<Location> locations = locationRepository.findAll();
        return ResponseEntity.ok(locations);
    }

    // Create new location (only leader or admin)
    @PostMapping("/leader/locations")
    public ResponseEntity<?> createLocation(@RequestBody Location location, Authentication auth) {
        String email = (String) auth.getPrincipal();
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null || (user.getRol() != Role.LIDER && user.getRol() != Role.ADMIN)) {
            return ResponseEntity.status(403).body(Map.of("error", "Only leader or admin can create locations"));
        }
        Location saved = locationRepository.save(location);
        return ResponseEntity.ok(saved);
    }

    // Update location (only leader or admin)
    @PutMapping("/leader/locations/{id}")
    public ResponseEntity<?> updateLocation(@PathVariable Long id, @RequestBody Location location, Authentication auth) {
        String email = (String) auth.getPrincipal();
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null || (user.getRol() != Role.LIDER && user.getRol() != Role.ADMIN)) {
            return ResponseEntity.status(403).body(Map.of("error", "Only leader or admin can update locations"));
        }
        
        Location existing = locationRepository.findById(id).orElse(null);
        if (existing == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Location not found"));
        }
        
        existing.setName(location.getName());
        existing.setAddress(location.getAddress());
        existing.setGoogleMapsUrl(location.getGoogleMapsUrl());
        Location updated = locationRepository.save(existing);
        return ResponseEntity.ok(updated);
    }

    // Delete location (only leader or admin)
    @DeleteMapping("/leader/locations/{id}")
    public ResponseEntity<?> deleteLocation(@PathVariable Long id, Authentication auth) {
        String email = (String) auth.getPrincipal();
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null || (user.getRol() != Role.LIDER && user.getRol() != Role.ADMIN)) {
            return ResponseEntity.status(403).body(Map.of("error", "Only leader or admin can delete locations"));
        }
        
        locationRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Location deleted"));
    }
}
