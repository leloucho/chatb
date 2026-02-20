package com.aetos.backend.repository;

import com.aetos.backend.model.AbsenceJustification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AbsenceJustificationRepository extends JpaRepository<AbsenceJustification, Long> {
    List<AbsenceJustification> findByStatusOrderBySubmittedAtDesc(String status);
    List<AbsenceJustification> findByUser_IdOrderBySubmittedAtDesc(Long userId);
}
