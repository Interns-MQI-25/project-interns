-- Remove duplicate department entries
-- Keep only the first 9 departments (IDs 1-9) and remove duplicates (IDs 10-27)

-- First, check if any employees are assigned to duplicate departments
-- If so, update them to point to the original departments
UPDATE employees 
SET department_id = CASE 
    WHEN department_id = 10 THEN 1  -- RDT-PU
    WHEN department_id = 11 THEN 2  -- RDA-PU
    WHEN department_id = 12 THEN 3  -- RDF-PU
    WHEN department_id = 13 THEN 4  -- RDL-PU
    WHEN department_id = 14 THEN 5  -- RDD-PU
    WHEN department_id = 15 THEN 6  -- RDE-PU
    WHEN department_id = 16 THEN 7  -- RDM-PU
    WHEN department_id = 17 THEN 8  -- RDS-PU
    WHEN department_id = 18 THEN 9  -- RDV-PU
    WHEN department_id = 19 THEN 1  -- RDT-PU
    WHEN department_id = 20 THEN 2  -- RDA-PU
    WHEN department_id = 21 THEN 3  -- RDF-PU
    WHEN department_id = 22 THEN 4  -- RDL-PU
    WHEN department_id = 23 THEN 5  -- RDD-PU
    WHEN department_id = 24 THEN 6  -- RDE-PU
    WHEN department_id = 25 THEN 7  -- RDM-PU
    WHEN department_id = 26 THEN 8  -- RDS-PU
    WHEN department_id = 27 THEN 9  -- RDV-PU
    ELSE department_id
END
WHERE department_id > 9;

-- Update any registration requests pointing to duplicate departments
UPDATE registration_requests 
SET department_id = CASE 
    WHEN department_id = 10 THEN 1  -- RDT-PU
    WHEN department_id = 11 THEN 2  -- RDA-PU
    WHEN department_id = 12 THEN 3  -- RDF-PU
    WHEN department_id = 13 THEN 4  -- RDL-PU
    WHEN department_id = 14 THEN 5  -- RDD-PU
    WHEN department_id = 15 THEN 6  -- RDE-PU
    WHEN department_id = 16 THEN 7  -- RDM-PU
    WHEN department_id = 17 THEN 8  -- RDS-PU
    WHEN department_id = 18 THEN 9  -- RDV-PU
    WHEN department_id = 19 THEN 1  -- RDT-PU
    WHEN department_id = 20 THEN 2  -- RDA-PU
    WHEN department_id = 21 THEN 3  -- RDF-PU
    WHEN department_id = 22 THEN 4  -- RDL-PU
    WHEN department_id = 23 THEN 5  -- RDD-PU
    WHEN department_id = 24 THEN 6  -- RDE-PU
    WHEN department_id = 25 THEN 7  -- RDM-PU
    WHEN department_id = 26 THEN 8  -- RDS-PU
    WHEN department_id = 27 THEN 9  -- RDV-PU
    ELSE department_id
END
WHERE department_id > 9;

-- Now delete the duplicate department entries
DELETE FROM departments WHERE department_id > 9;

-- Reset the auto_increment to 10 for future inserts
ALTER TABLE departments AUTO_INCREMENT = 10;

-- Verify the cleanup
SELECT * FROM departments ORDER BY department_id;
