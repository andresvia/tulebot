DROP TABLE IF EXISTS `msgtable`;
CREATE TABLE `msgtable` (
	  `msgchannel` BIGINT NOT NULL,
	  `msgstart` BIGINT NOT NULL,
	  `msgmsg` text NOT NULL,
	  `msgtimesread` BIGINT NOT NULL,
	  `msgupdated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	  UNIQUE KEY `msgchannel_msgstart` (`msgchannel`, `msgstart`),
	  KEY `msgupdated` (`msgupdated`),
	  FULLTEXT KEY `msgmsg` (`msgmsg`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8
