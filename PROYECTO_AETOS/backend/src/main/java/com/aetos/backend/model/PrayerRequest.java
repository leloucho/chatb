package com.aetos.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "prayer_requests")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PrayerRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String requestText;

    private String requesterName; // For visitors or member name

    private boolean isVisitor; // true if not a registered member

    @ManyToOne
    private Meeting meeting;

    private LocalDateTime createdAt;
}
