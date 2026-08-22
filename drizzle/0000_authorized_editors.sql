CREATE TABLE IF NOT EXISTS `authorized_editors` (
  `email` text PRIMARY KEY COLLATE NOCASE NOT NULL,
  `added_at` text NOT NULL,
  `added_by` text NOT NULL
);
