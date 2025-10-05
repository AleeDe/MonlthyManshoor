/*
  # Magazine Archive Database Schema

  ## Overview
  This migration creates the database structure for a 45-year Urdu magazine archive system.
  It includes tables for magazine issues, sister publications, and administrative features.

  ## New Tables

  ### 1. `magazine_issues`
  Stores information about each magazine issue published over 45 years.
  - `id` (uuid, primary key) - Unique identifier for each issue
  - `title` (text) - Issue title in Urdu/English
  - `description` (text) - Brief description of the issue content
  - `cover_image_url` (text) - Cloudinary URL for the cover image
  - `pdf_url` (text) - Cloudinary URL for the PDF file
  - `issue_month` (integer) - Month of publication (1-12)
  - `issue_year` (integer) - Year of publication
  - `publish_date` (date) - Full publication date
  - `featured` (boolean) - Whether to show on homepage
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. `sister_magazines`
  Stores information about related/sister publications.
  - `id` (uuid, primary key) - Unique identifier
  - `name` (text) - Magazine name
  - `logo_url` (text) - Logo/cover image URL
  - `website_url` (text) - External website link
  - `description` (text) - Brief description
  - `display_order` (integer) - Sort order for display
  - `active` (boolean) - Whether to show on site
  - `created_at` (timestamptz) - Record creation timestamp

  ## Security
  - Row Level Security (RLS) enabled on all tables
  - Public read access for magazine_issues and sister_magazines (public archive)
  - Admin authentication required for insert/update/delete operations
  
  ## Indexes
  - Composite index on (issue_year, issue_month) for efficient archive filtering
  - Index on featured flag for homepage queries
  - Index on display_order for sister magazines

  ## Notes
  - PDF files and images are stored in Cloudinary (URLs only in database)
  - Data is designed for a static site with public read access
  - Admin operations require authentication
*/

-- Create magazine_issues table
CREATE TABLE IF NOT EXISTS magazine_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  cover_image_url text NOT NULL,
  pdf_url text NOT NULL,
  issue_month integer NOT NULL CHECK (issue_month >= 1 AND issue_month <= 12),
  issue_year integer NOT NULL CHECK (issue_year >= 1980 AND issue_year <= 2100),
  publish_date date NOT NULL,
  featured boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create sister_magazines table
CREATE TABLE IF NOT EXISTS sister_magazines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text NOT NULL,
  website_url text DEFAULT '',
  description text DEFAULT '',
  display_order integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_magazine_issues_year_month 
  ON magazine_issues(issue_year DESC, issue_month DESC);

CREATE INDEX IF NOT EXISTS idx_magazine_issues_featured 
  ON magazine_issues(featured) WHERE featured = true;

CREATE INDEX IF NOT EXISTS idx_sister_magazines_order 
  ON sister_magazines(display_order) WHERE active = true;

-- Enable Row Level Security
ALTER TABLE magazine_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE sister_magazines ENABLE ROW LEVEL SECURITY;

-- Public read access for all users (static site with public archive)
CREATE POLICY "Anyone can view magazine issues"
  ON magazine_issues FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view sister magazines"
  ON sister_magazines FOR SELECT
  USING (true);

-- Admin policies for data management (authenticated users only)
CREATE POLICY "Authenticated users can insert magazine issues"
  ON magazine_issues FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update magazine issues"
  ON magazine_issues FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete magazine issues"
  ON magazine_issues FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert sister magazines"
  ON sister_magazines FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update sister magazines"
  ON sister_magazines FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete sister magazines"
  ON sister_magazines FOR DELETE
  TO authenticated
  USING (true);