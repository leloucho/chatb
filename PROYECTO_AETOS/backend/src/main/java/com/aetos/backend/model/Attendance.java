package com.aetos.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "attendances")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Attendance {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    private User user;

    @ManyToOne
    private Meeting meeting;

    private LocalDateTime timestamp;

    // Para asistencia manual marcada por líder
    @ManyToOne
    @JoinColumn(name = "marked_by")
    private User markedBy;

    @Column(name = "marked_manually")
    private Boolean markedManually = false;

    @Column(name = "justification", length = 500)
    private String justification;
}
