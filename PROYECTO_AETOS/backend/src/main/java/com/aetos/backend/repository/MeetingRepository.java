package com.aetos.backend.repository;

import com.aetos.backend.model.Meeting;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface MeetingRepository extends JpaRepository<Meeting, Long> {
    Optional<Meeting> findByTokenQrAndActivaTrue(String tokenQr);
}
