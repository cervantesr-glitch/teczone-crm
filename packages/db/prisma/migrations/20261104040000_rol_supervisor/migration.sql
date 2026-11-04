-- Rol Supervisor: supervisa al equipo comercial y elige la empresa con que cotiza.
ALTER TABLE `user_roles` MODIFY `role` ENUM('ADMIN', 'DIRECCION', 'GERENTE_COMERCIAL', 'SUPERVISOR', 'EJECUTIVO_PYME', 'EJECUTIVO_TECH', 'PREVENTA', 'CUSTOMER_SUCCESS', 'COMPRAS_OPERACIONES') NOT NULL;
