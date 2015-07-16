DROP TABLE IF EXISTS `msgtable`;
CREATE TABLE `msgtable` (
	  `msgchannel` BIGINT NOT NULL,
	  `msgstart` datetime NOT NULL,
	  `msgmsg` text NOT NULL,
	  `msgat` datetime NOT NULL,
	  `msgupdated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	  UNIQUE KEY `msgchannel_msgstart` (`msgchannel`, `msgstart`),
	  KEY `msgat` (`msgat`),
	  FULLTEXT KEY `msgmsg` (`msgmsg`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8
