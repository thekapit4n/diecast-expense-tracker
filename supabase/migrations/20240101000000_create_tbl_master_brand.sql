-- Create brands table
CREATE TABLE IF NOT EXISTS tbl_master_brand (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    type character varying(50),
    isactive integer DEFAULT 1,
    CONSTRAINT tbl_master_brand_pkey PRIMARY KEY (id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tbl_master_brand_name ON tbl_master_brand(name);
CREATE INDEX IF NOT EXISTS idx_tbl_master_brand_isactive ON tbl_master_brand(isactive);
CREATE INDEX IF NOT EXISTS idx_tbl_master_brand_type ON tbl_master_brand(type);

-- Add comment to table
COMMENT ON TABLE tbl_master_brand IS 'Master table for diecast brands';

