package com.aetos.backend.repository;

import com.aetos.backend.model.Resource;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ResourceRepository extends JpaRepository<Resource, Long> {
    List<Resource> findAllByOrderByFechaSubidaDesc();
    List<Resource> findByUsuarioEmailOrderByFechaSubidaDesc(String usuarioEmail);
}
