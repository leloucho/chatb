package com.aetos.backend.repository;

import com.aetos.backend.model.PrayerRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PrayerRequestRepository extends JpaRepository<PrayerRequest, Long> {
    List<PrayerRequest> findByMeetingId(Long meetingId);
}
