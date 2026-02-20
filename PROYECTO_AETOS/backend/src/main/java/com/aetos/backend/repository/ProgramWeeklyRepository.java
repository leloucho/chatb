package com.aetos.backend.repository;

import com.aetos.backend.model.ProgramWeekly;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ProgramWeeklyRepository extends JpaRepository<ProgramWeekly, Long> {
    Optional<ProgramWeekly> findByWeekStart(LocalDate weekStart);
    
    @Query("SELECT p FROM ProgramWeekly p WHERE " +
           "p.weekStart BETWEEN :startDate AND :endDate " +
           "ORDER BY p.weekStart ASC")
    List<ProgramWeekly> findUpcomingProgramsByUserEmail(
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );
}
