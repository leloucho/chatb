package com.aetos.backend.service;

import com.aetos.backend.model.User;
import com.aetos.backend.repository.UserRepository;
import org.springframework.stereotype.Service;

@Service
public class CustomUserDetailsService {
    private final UserRepository userRepository;

    public CustomUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User findByEmail(String email) {
        return userRepository.findByEmail(email).orElse(null);
    }
}
