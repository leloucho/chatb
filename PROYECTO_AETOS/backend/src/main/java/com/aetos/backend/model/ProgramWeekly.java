package com.aetos.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "program_weekly")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProgramWeekly {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDate weekStart; // date representing the week
    private String hora; // time of the program (default 8:00 PM)
    private String horaFin; // end time of the program (default 10:00 PM)

    @ManyToOne
    @JoinColumn(name = "location_id")
    private Location location;

    // five responsibilities
    private String responsableConfraternizacion;
    private String responsableDinamica;
    private String responsableEspecial;
    private String responsableOracionIntercesora;
    private String responsableTema;
}
