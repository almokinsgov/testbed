// Extracted Stage 2: G2P V4 Lexicon and Public Demo pipeline.
// Depends on app_shared.js, segmenter_core.js, and later inline helpers such as tokenizeTextBlockParts.

  // G2P V4 Lexicon (Master JSON v4, compact fields)
  // Focus fields: segment_id, unit, proper_ipa, combination amo manual, and variation fields
  // Variation fields used here: "Full word used bracket part of word" and "Just the part of full word"
  // ------------------------------------------------------------

  const LEXICON_V4_ROWS = [{"segment_id":1165,"unit":"Ngūū","unit_norm":"ngūū","ipa":"ŋˤŋuːuː","phonetic":"ng-ooh-ooh","vars":[],"eng_variants":[]},{"segment_id":1164,"unit":"Nguū","unit_norm":"nguū","ipa":"ŋˤŋʊːuː","phonetic":"ng-ew-ooh","vars":[],"eng_variants":[]},{"segment_id":1163,"unit":"Ngūu","unit_norm":"ngūu","ipa":"ŋˤŋuːʊː","phonetic":"ng-ooh-ew","vars":[],"eng_variants":[]},{"segment_id":1162,"unit":"Ngūō","unit_norm":"ngūō","ipa":"ŋˤŋuːɔːr","phonetic":"ng-ooh-or","vars":[],"eng_variants":[]},{"segment_id":1161,"unit":"Ngaō","unit_norm":"ngaō","ipa":"ŋˤŋɑɔːr","phonetic":"ng-ah-or","vars":[],"eng_variants":[]},{"segment_id":1160,"unit":"Ngūo","unit_norm":"ngūo","ipa":"ŋˤŋuːɔː","phonetic":"ng-ooh-aw","vars":[],"eng_variants":[]},{"segment_id":1159,"unit":"Ngūī","unit_norm":"ngūī","ipa":"ŋˤŋuːiːː","phonetic":"ng-ooh-eee","vars":[],"eng_variants":[]},{"segment_id":1158,"unit":"Nguī","unit_norm":"nguī","ipa":"ŋˤŋʊːiːː","phonetic":"ng-ew-eee","vars":[],"eng_variants":[]},{"segment_id":1157,"unit":"Ngūi","unit_norm":"ngūi","ipa":"ŋˤŋuːiː","phonetic":"ng-ooh-ee","vars":[],"eng_variants":[]},{"segment_id":1156,"unit":"Ngūē","unit_norm":"ngūē","ipa":"ŋˤŋuːɛː","phonetic":"ng-ooh-ehh","vars":[],"eng_variants":[]},{"segment_id":1155,"unit":"Ngūe","unit_norm":"ngūe","ipa":"ŋˤŋuːɛh","phonetic":"ng-ooh-eh","vars":[],"eng_variants":[]},{"segment_id":1154,"unit":"Ngūā","unit_norm":"ngūā","ipa":"ŋˤŋuːɑːː","phonetic":"ng-ooh-ahh","vars":[],"eng_variants":[]},{"segment_id":1153,"unit":"Nguā","unit_norm":"nguā","ipa":"ŋˤŋʊːɑːː","phonetic":"ng-ew-ahh","vars":[],"eng_variants":[]},{"segment_id":1152,"unit":"Ngūa","unit_norm":"ngūa","ipa":"ŋˤŋuːɑ","phonetic":"ng-ooh-ah","vars":[],"eng_variants":[]},{"segment_id":1151,"unit":"Ngōū","unit_norm":"ngōū","ipa":"ŋˤŋɔːruː","phonetic":"ng-or-ooh","vars":[],"eng_variants":[]},{"segment_id":1150,"unit":"Ngoū","unit_norm":"ngoū","ipa":"ŋˤŋɔːuː","phonetic":"ng-aw-ooh","vars":[],"eng_variants":[]},{"segment_id":1149,"unit":"Ngōu","unit_norm":"ngōu","ipa":"ŋˤŋɔːrʊː","phonetic":"ng-or-ew","vars":[],"eng_variants":[]},{"segment_id":1148,"unit":"Ngōō","unit_norm":"ngōō","ipa":"ŋˤŋɔːrɔːr","phonetic":"ng-or-or","vars":[],"eng_variants":[]},{"segment_id":1147,"unit":"Ngoō","unit_norm":"ngoō","ipa":"ŋˤŋɔːɔːr","phonetic":"ng-aw-or","vars":[],"eng_variants":[]},{"segment_id":1146,"unit":"Ngōo","unit_norm":"ngōo","ipa":"ŋˤŋɔːrɔː","phonetic":"ng-or-aw","vars":[],"eng_variants":[]},{"segment_id":1145,"unit":"Ngōī","unit_norm":"ngōī","ipa":"ŋˤŋɔːriːː","phonetic":"ng-or-eee","vars":[],"eng_variants":[]},{"segment_id":1144,"unit":"Ngoī","unit_norm":"ngoī","ipa":"ŋˤŋɔːiːː","phonetic":"ng-aw-eee","vars":[],"eng_variants":[]},{"segment_id":1143,"unit":"Ngōi","unit_norm":"ngōi","ipa":"ŋˤŋɔːriː","phonetic":"ng-or-ee","vars":[],"eng_variants":[]},{"segment_id":1142,"unit":"Ngōē","unit_norm":"ngōē","ipa":"ŋˤŋɔːrɛː","phonetic":"ng-or-ehh","vars":[],"eng_variants":[]},{"segment_id":1141,"unit":"Ngōe","unit_norm":"ngōe","ipa":"ŋˤŋɔːrɛh","phonetic":"ng-or-eh","vars":[],"eng_variants":[]},{"segment_id":1140,"unit":"Ngōā","unit_norm":"ngōā","ipa":"ŋˤŋɔːrɑːː","phonetic":"ng-or-ahh","vars":[],"eng_variants":[]},{"segment_id":1139,"unit":"Ngoā","unit_norm":"ngoā","ipa":"ŋˤŋɔːɑːː","phonetic":"ng-aw-ahh","vars":[],"eng_variants":[]},{"segment_id":1138,"unit":"Ngōa","unit_norm":"ngōa","ipa":"ŋˤŋɔːrɑ","phonetic":"ng-or-ah","vars":[],"eng_variants":[]},{"segment_id":1137,"unit":"Ngīū","unit_norm":"ngīū","ipa":"ŋˤŋiːːuː","phonetic":"ng-eee-ooh","vars":[],"eng_variants":[]},{"segment_id":1136,"unit":"Ngiū","unit_norm":"ngiū","ipa":"ŋˤŋiːuː","phonetic":"ng-ee-ooh","vars":[],"eng_variants":[]},{"segment_id":1135,"unit":"Ngīu","unit_norm":"ngīu","ipa":"ŋˤŋiːːʊː","phonetic":"ng-eee-ew","vars":[],"eng_variants":[]},{"segment_id":1134,"unit":"Ngīō","unit_norm":"ngīō","ipa":"ŋˤŋiːːɔːr","phonetic":"ng-eee-or","vars":[],"eng_variants":[]},{"segment_id":1133,"unit":"Ngiō","unit_norm":"ngiō","ipa":"ŋˤŋiːɔːr","phonetic":"ng-ee-or","vars":[],"eng_variants":[]},{"segment_id":1132,"unit":"Ngīo","unit_norm":"ngīo","ipa":"ŋˤŋiːːɔː","phonetic":"ng-eee-aw","vars":[],"eng_variants":[]},{"segment_id":1131,"unit":"Ngīī","unit_norm":"ngīī","ipa":"ŋˤŋiːːiːː","phonetic":"ng-eee-eee","vars":[],"eng_variants":[]},{"segment_id":1130,"unit":"Ngiī","unit_norm":"ngiī","ipa":"ŋˤŋiːiːː","phonetic":"ng-ee-eee","vars":[],"eng_variants":[]},{"segment_id":1129,"unit":"Ngīi","unit_norm":"ngīi","ipa":"ŋˤŋiːːiː","phonetic":"ng-eee-ee","vars":[],"eng_variants":[]},{"segment_id":1128,"unit":"Ngīē","unit_norm":"ngīē","ipa":"ŋˤŋiːːɛː","phonetic":"ng-eee-ehh","vars":[],"eng_variants":[]},{"segment_id":1127,"unit":"Ngīe","unit_norm":"ngīe","ipa":"ŋˤŋiːːɛh","phonetic":"ng-eee-eh","vars":[],"eng_variants":[]},{"segment_id":1126,"unit":"Ngīā","unit_norm":"ngīā","ipa":"ŋˤŋiːːɑːː","phonetic":"ng-eee-ahh","vars":[],"eng_variants":[]},{"segment_id":1125,"unit":"Ngiā","unit_norm":"ngiā","ipa":"ŋˤŋiːɑːː","phonetic":"ng-ee-ahh","vars":[],"eng_variants":[]},{"segment_id":1124,"unit":"Ngīa","unit_norm":"ngīa","ipa":"ŋˤŋiːːɑ","phonetic":"ng-eee-ah","vars":[],"eng_variants":[]},{"segment_id":1123,"unit":"Ngēū","unit_norm":"ngēū","ipa":"ŋˤŋɛːuː","phonetic":"ng-ehh-ooh","vars":[],"eng_variants":[]},{"segment_id":1122,"unit":"Ngeū","unit_norm":"ngeū","ipa":"ŋˤŋɛhuː","phonetic":"ng-eh-ooh","vars":[],"eng_variants":[]},{"segment_id":1121,"unit":"Ngēu","unit_norm":"ngēu","ipa":"ŋˤŋɛːʊː","phonetic":"ng-ehh-ew","vars":[],"eng_variants":[]},{"segment_id":1120,"unit":"Ngēō","unit_norm":"ngēō","ipa":"ŋˤŋɛːɔːr","phonetic":"ng-ehh-or","vars":[],"eng_variants":[]},{"segment_id":1119,"unit":"Ngeō","unit_norm":"ngeō","ipa":"ŋˤŋɛhɔːr","phonetic":"ng-eh-or","vars":[],"eng_variants":[]},{"segment_id":1118,"unit":"Ngēo","unit_norm":"ngēo","ipa":"ŋˤŋɛːɔː","phonetic":"ng-ehh-aw","vars":[],"eng_variants":[]},{"segment_id":1117,"unit":"Ngēī","unit_norm":"ngēī","ipa":"ŋˤŋɛːiːː","phonetic":"ng-ehh-eee","vars":[],"eng_variants":[]},{"segment_id":1116,"unit":"Ngeī","unit_norm":"ngeī","ipa":"ŋˤŋɛhiːː","phonetic":"ng-eh-eee","vars":[],"eng_variants":[]},{"segment_id":1115,"unit":"Ngēi","unit_norm":"ngēi","ipa":"ŋˤŋɛːiː","phonetic":"ng-ehh-ee","vars":[],"eng_variants":[]},{"segment_id":1114,"unit":"Ngēē","unit_norm":"ngēē","ipa":"ŋˤŋɛːɛː","phonetic":"ng-ehh-ehh","vars":[],"eng_variants":[]},{"segment_id":1113,"unit":"Ngēe","unit_norm":"ngēe","ipa":"ŋˤŋɛːɛh","phonetic":"ng-ehh-eh","vars":[],"eng_variants":[]},{"segment_id":1112,"unit":"Ngēā","unit_norm":"ngēā","ipa":"ŋˤŋɛːɑːː","phonetic":"ng-ehh-ahh","vars":[],"eng_variants":[]},{"segment_id":1111,"unit":"Ngeā","unit_norm":"ngeā","ipa":"ŋˤŋɛhɑːː","phonetic":"ng-eh-ahh","vars":[],"eng_variants":[]},{"segment_id":1110,"unit":"Ngēa","unit_norm":"ngēa","ipa":"ŋˤŋɛːɑ","phonetic":"ng-ehh-ah","vars":[],"eng_variants":[]},{"segment_id":1109,"unit":"Ngāū","unit_norm":"ngāū","ipa":"ŋˤŋɑːːuː","phonetic":"ng-ahh-ooh","vars":[],"eng_variants":[]},{"segment_id":1108,"unit":"Ngaū","unit_norm":"ngaū","ipa":"ŋˤŋɑuː","phonetic":"ng-ah-ooh","vars":[],"eng_variants":[]},{"segment_id":1107,"unit":"Ngāu","unit_norm":"ngāu","ipa":"ŋˤŋɑːːʊː","phonetic":"ng-ahh-ew","vars":[],"eng_variants":[]},{"segment_id":1106,"unit":"Ngāō","unit_norm":"ngāō","ipa":"ŋˤŋɑːːɔːr","phonetic":"ng-ahh-or","vars":[],"eng_variants":[]},{"segment_id":1105,"unit":"Ngaō","unit_norm":"ngaō","ipa":"ŋˤŋɑɔːr","phonetic":"ng-ah-or","vars":[],"eng_variants":[]},{"segment_id":1104,"unit":"Ngāo","unit_norm":"ngāo","ipa":"ŋˤŋɑːːɔː","phonetic":"ng-ahh-aw","vars":[],"eng_variants":[]},{"segment_id":1103,"unit":"Ngāī","unit_norm":"ngāī","ipa":"ŋˤŋɑːːiːː","phonetic":"ng-ahh-eee","vars":[],"eng_variants":[]},{"segment_id":1102,"unit":"Ngaī","unit_norm":"ngaī","ipa":"ŋˤŋɑiːː","phonetic":"ng-ah-eee","vars":[],"eng_variants":[]},{"segment_id":1101,"unit":"Ngāi","unit_norm":"ngāi","ipa":"ŋˤŋɑːːiː","phonetic":"ng-ahh-ee","vars":[],"eng_variants":[]},{"segment_id":1100,"unit":"Ngāē","unit_norm":"ngāē","ipa":"ŋˤŋɑːːɛː","phonetic":"ng-ahh-ehh","vars":[],"eng_variants":[]},{"segment_id":1099,"unit":"Ngāe","unit_norm":"ngāe","ipa":"ŋˤŋɑːːɛh","phonetic":"ng-ahh-eh","vars":[],"eng_variants":[]},{"segment_id":1098,"unit":"Ngāā","unit_norm":"ngāā","ipa":"ŋˤŋɑːːɑːː","phonetic":"ng-ahh-ahh","vars":[],"eng_variants":[]},{"segment_id":1097,"unit":"Ngaā","unit_norm":"ngaā","ipa":"ŋˤŋɑɑːː","phonetic":"ng-ah-ahh","vars":[],"eng_variants":[]},{"segment_id":1096,"unit":"Ngāa","unit_norm":"ngāa","ipa":"ŋˤŋɑːːɑ","phonetic":"ng-ahh-ah","vars":[],"eng_variants":[]},{"segment_id":1095,"unit":"Nguu","unit_norm":"nguu","ipa":"ŋˤŋʊːʊː","phonetic":"ng-ew-ew","vars":[],"eng_variants":[]},{"segment_id":1094,"unit":"Nguo","unit_norm":"nguo","ipa":"ŋˤŋʊːɔː","phonetic":"ng-ew-aw","vars":[],"eng_variants":[]},{"segment_id":1093,"unit":"Ngui","unit_norm":"ngui","ipa":"ŋˤŋʊːiː","phonetic":"ng-ew-ee","vars":[],"eng_variants":[]},{"segment_id":1092,"unit":"Ngue","unit_norm":"ngue","ipa":"ŋˤŋʊːɛh","phonetic":"ng-ew-eh","vars":[],"eng_variants":[]},{"segment_id":1091,"unit":"Ngua","unit_norm":"ngua","ipa":"ŋˤŋʊːɑ","phonetic":"ng-ew-ah","vars":[],"eng_variants":[]},{"segment_id":1090,"unit":"Ngou","unit_norm":"ngou","ipa":"ŋˤŋɔːʊː","phonetic":"ng-aw-ew","vars":[],"eng_variants":[]},{"segment_id":1089,"unit":"Ngoo","unit_norm":"ngoo","ipa":"ŋˤŋɔːɔː","phonetic":"ng-aw-aw","vars":[],"eng_variants":[]},{"segment_id":1088,"unit":"Ngoi","unit_norm":"ngoi","ipa":"ŋˤŋɔːiː","phonetic":"ng-aw-ee","vars":[],"eng_variants":[]},{"segment_id":1087,"unit":"Ngoe","unit_norm":"ngoe","ipa":"ŋˤŋɔːɛh","phonetic":"ng-aw-eh","vars":[],"eng_variants":[]},{"segment_id":1086,"unit":"Ngoa","unit_norm":"ngoa","ipa":"ŋˤŋɔːɑ","phonetic":"ng-aw-ah","vars":[],"eng_variants":[]},{"segment_id":1085,"unit":"Ngiu","unit_norm":"ngiu","ipa":"ŋˤŋiːʊː","phonetic":"ng-ee-ew","vars":[],"eng_variants":[]},{"segment_id":1084,"unit":"Ngio","unit_norm":"ngio","ipa":"ŋˤŋiːɔː","phonetic":"ng-ee-aw","vars":[],"eng_variants":[]},{"segment_id":1083,"unit":"Ngii","unit_norm":"ngii","ipa":"ŋˤŋiːiː","phonetic":"ng-ee-ee","vars":[],"eng_variants":[]},{"segment_id":1082,"unit":"Ngie","unit_norm":"ngie","ipa":"ŋˤŋiːɛh","phonetic":"ng-ee-eh","vars":[],"eng_variants":[]},{"segment_id":1081,"unit":"Ngia","unit_norm":"ngia","ipa":"ŋˤŋiːɑ","phonetic":"ng-ee-ah","vars":[],"eng_variants":[]},{"segment_id":1080,"unit":"Ngeu","unit_norm":"ngeu","ipa":"ŋˤŋɛhʊː","phonetic":"ng-eh-ew","vars":[],"eng_variants":[]},{"segment_id":1079,"unit":"Ngeo","unit_norm":"ngeo","ipa":"ŋˤŋɛhɔː","phonetic":"ng-eh-aw","vars":[],"eng_variants":[]},{"segment_id":1078,"unit":"Ngei","unit_norm":"ngei","ipa":"ŋˤŋɛhiː","phonetic":"ng-eh-ee","vars":[],"eng_variants":[]},{"segment_id":1077,"unit":"Ngee","unit_norm":"ngee","ipa":"ŋˤŋɛhɛh","phonetic":"ng-eh-eh","vars":[],"eng_variants":[]},{"segment_id":1076,"unit":"Ngea","unit_norm":"ngea","ipa":"ŋˤŋɛhɑ","phonetic":"ng-eh-ah","vars":[],"eng_variants":[]},{"segment_id":1075,"unit":"Ngau","unit_norm":"ngau","ipa":"ŋˤŋɑʊː","phonetic":"ng-ah-ew","vars":[],"eng_variants":[]},{"segment_id":1074,"unit":"Ngao","unit_norm":"ngao","ipa":"ŋˤŋɑɔː","phonetic":"ng-ah-aw","vars":[],"eng_variants":[]},{"segment_id":1073,"unit":"Ngai","unit_norm":"ngai","ipa":"ŋˤŋɑiː","phonetic":"ng-ah-ee","vars":[],"eng_variants":[]},{"segment_id":1072,"unit":"Ngae","unit_norm":"ngae","ipa":"ŋˤŋɑɛh","phonetic":"ng-ah-eh","vars":[],"eng_variants":[]},{"segment_id":1071,"unit":"Ngaa","unit_norm":"ngaa","ipa":"ŋˤŋɑɑ","phonetic":"ng-ah-ah","vars":[],"eng_variants":[]},{"segment_id":1070,"unit":"Ngū","unit_norm":"ngū","ipa":"ŋˤŋuː","phonetic":"ng-ooh","vars":[],"eng_variants":[]},{"segment_id":1069,"unit":"Ngō","unit_norm":"ngō","ipa":"ŋˤŋɔːr","phonetic":"ng-or","vars":[],"eng_variants":[]},{"segment_id":1068,"unit":"Ngī","unit_norm":"ngī","ipa":"ŋˤŋiːː","phonetic":"ng-eee","vars":[],"eng_variants":[]},{"segment_id":1067,"unit":"Ngē","unit_norm":"ngē","ipa":"ŋˤŋɛː","phonetic":"ng-ehh","vars":[],"eng_variants":[]},{"segment_id":1066,"unit":"Ngā","unit_norm":"ngā","ipa":"ŋˤŋɑːː","phonetic":"ng-ahh","vars":[{"label":"v1","bracket":"ha(ngar)","just_part":"ngar"}],"eng_variants":["ha(ngar)"]},{"segment_id":1065,"unit":"Ngu","unit_norm":"ngu","ipa":"ŋˤŋʊː","phonetic":"ng-ew","vars":[],"eng_variants":[]},{"segment_id":1064,"unit":"Ngo","unit_norm":"ngo","ipa":"ŋˤŋɔː","phonetic":"ng-aw","vars":[],"eng_variants":[]},{"segment_id":1063,"unit":"Ngi","unit_norm":"ngi","ipa":"ŋˤŋiː","phonetic":"ng-ee","vars":[],"eng_variants":[]},{"segment_id":1062,"unit":"Nge","unit_norm":"nge","ipa":"ŋˤŋɛh","phonetic":"ng-eh","vars":[],"eng_variants":[]},{"segment_id":1061,"unit":"Nga","unit_norm":"nga","ipa":"ŋˤŋɑ","phonetic":"ng-ah","vars":[{"label":"v1","bracket":"ha(ngar)","just_part":"ngar"}],"eng_variants":["ha(ngar)"]},{"segment_id":1060,"unit":"Whūū","unit_norm":"whūū","ipa":"fuːuː","phonetic":"f-ooh-ooh","vars":[],"eng_variants":[]},{"segment_id":1059,"unit":"Whuū","unit_norm":"whuū","ipa":"fʊːuː","phonetic":"f-ew-ooh","vars":[],"eng_variants":[]},{"segment_id":1058,"unit":"Whūu","unit_norm":"whūu","ipa":"fuːʊː","phonetic":"f-ooh-ew","vars":[],"eng_variants":[]},{"segment_id":1057,"unit":"Whūō","unit_norm":"whūō","ipa":"fuːɔːr","phonetic":"f-ooh-or","vars":[],"eng_variants":[]},{"segment_id":1056,"unit":"Whaō","unit_norm":"whaō","ipa":"fɑɔːr","phonetic":"f-ah-or","vars":[],"eng_variants":[]},{"segment_id":1055,"unit":"Whūo","unit_norm":"whūo","ipa":"fuːɔː","phonetic":"f-ooh-aw","vars":[],"eng_variants":[]},{"segment_id":1054,"unit":"Whūī","unit_norm":"whūī","ipa":"fuːiːː","phonetic":"f-ooh-eee","vars":[],"eng_variants":[]},{"segment_id":1053,"unit":"Whuī","unit_norm":"whuī","ipa":"fʊːiːː","phonetic":"f-ew-eee","vars":[],"eng_variants":[]},{"segment_id":1052,"unit":"Whūi","unit_norm":"whūi","ipa":"fuːiː","phonetic":"f-ooh-ee","vars":[],"eng_variants":[]},{"segment_id":1051,"unit":"Whūē","unit_norm":"whūē","ipa":"fuːɛː","phonetic":"f-ooh-ehh","vars":[],"eng_variants":[]},{"segment_id":1050,"unit":"Whūe","unit_norm":"whūe","ipa":"fuːɛh","phonetic":"f-ooh-eh","vars":[],"eng_variants":[]},{"segment_id":1049,"unit":"Whūā","unit_norm":"whūā","ipa":"fuːɑːː","phonetic":"f-ooh-ahh","vars":[],"eng_variants":[]},{"segment_id":1048,"unit":"Whuā","unit_norm":"whuā","ipa":"fʊːɑːː","phonetic":"f-ew-ahh","vars":[],"eng_variants":[]},{"segment_id":1047,"unit":"Whūa","unit_norm":"whūa","ipa":"fuːɑ","phonetic":"f-ooh-ah","vars":[],"eng_variants":[]},{"segment_id":1046,"unit":"Whōū","unit_norm":"whōū","ipa":"fɔːruː","phonetic":"f-or-ooh","vars":[],"eng_variants":[]},{"segment_id":1045,"unit":"Whoū","unit_norm":"whoū","ipa":"fɔːuː","phonetic":"f-aw-ooh","vars":[],"eng_variants":[]},{"segment_id":1044,"unit":"Whōu","unit_norm":"whōu","ipa":"fɔːrʊː","phonetic":"f-or-ew","vars":[],"eng_variants":[]},{"segment_id":1043,"unit":"Whōō","unit_norm":"whōō","ipa":"fɔːrɔːr","phonetic":"f-or-or","vars":[],"eng_variants":[]},{"segment_id":1042,"unit":"Whoō","unit_norm":"whoō","ipa":"fɔːɔːr","phonetic":"f-aw-or","vars":[],"eng_variants":[]},{"segment_id":1041,"unit":"Whōo","unit_norm":"whōo","ipa":"fɔːrɔː","phonetic":"f-or-aw","vars":[],"eng_variants":[]},{"segment_id":1040,"unit":"Whōī","unit_norm":"whōī","ipa":"fɔːriːː","phonetic":"f-or-eee","vars":[],"eng_variants":[]},{"segment_id":1039,"unit":"Whoī","unit_norm":"whoī","ipa":"fɔːiːː","phonetic":"f-aw-eee","vars":[],"eng_variants":[]},{"segment_id":1038,"unit":"Whōi","unit_norm":"whōi","ipa":"fɔːriː","phonetic":"f-or-ee","vars":[],"eng_variants":[]},{"segment_id":1037,"unit":"Whōē","unit_norm":"whōē","ipa":"fɔːrɛː","phonetic":"f-or-ehh","vars":[],"eng_variants":[]},{"segment_id":1036,"unit":"Whōe","unit_norm":"whōe","ipa":"fɔːrɛh","phonetic":"f-or-eh","vars":[],"eng_variants":[]},{"segment_id":1035,"unit":"Whōā","unit_norm":"whōā","ipa":"fɔːrɑːː","phonetic":"f-or-ahh","vars":[],"eng_variants":[]},{"segment_id":1034,"unit":"Whoā","unit_norm":"whoā","ipa":"fɔːɑːː","phonetic":"f-aw-ahh","vars":[],"eng_variants":[]},{"segment_id":1033,"unit":"Whōa","unit_norm":"whōa","ipa":"fɔːrɑ","phonetic":"f-or-ah","vars":[],"eng_variants":[]},{"segment_id":1032,"unit":"Whīū","unit_norm":"whīū","ipa":"fiːːuː","phonetic":"f-eee-ooh","vars":[],"eng_variants":[]},{"segment_id":1031,"unit":"Whiū","unit_norm":"whiū","ipa":"fiːuː","phonetic":"f-ee-ooh","vars":[],"eng_variants":[]},{"segment_id":1030,"unit":"Whīu","unit_norm":"whīu","ipa":"fiːːʊː","phonetic":"f-eee-ew","vars":[],"eng_variants":[]},{"segment_id":1029,"unit":"Whīō","unit_norm":"whīō","ipa":"fiːːɔːr","phonetic":"f-eee-or","vars":[{"label":"base","bracket":"fiord","just_part":""}],"eng_variants":["fiord"]},{"segment_id":1028,"unit":"Whiō","unit_norm":"whiō","ipa":"fiːɔːr","phonetic":"f-ee-or","vars":[{"label":"base","bracket":"fiord","just_part":""}],"eng_variants":["fiord"]},{"segment_id":1027,"unit":"Whīo","unit_norm":"whīo","ipa":"fiːːɔː","phonetic":"f-eee-aw","vars":[{"label":"base","bracket":"fiord","just_part":""}],"eng_variants":["fiord"]},{"segment_id":1026,"unit":"Whīī","unit_norm":"whīī","ipa":"fiːːiːː","phonetic":"f-eee-eee","vars":[],"eng_variants":[]},{"segment_id":1025,"unit":"Whiī","unit_norm":"whiī","ipa":"fiːiːː","phonetic":"f-ee-eee","vars":[],"eng_variants":[]},{"segment_id":1024,"unit":"Whīi","unit_norm":"whīi","ipa":"fiːːiː","phonetic":"f-eee-ee","vars":[],"eng_variants":[]},{"segment_id":1023,"unit":"Whīē","unit_norm":"whīē","ipa":"fiːːɛː","phonetic":"f-eee-ehh","vars":[{"label":"base","bracket":"fake","just_part":""}],"eng_variants":["fake"]},{"segment_id":1022,"unit":"Whīe","unit_norm":"whīe","ipa":"fiːːɛh","phonetic":"f-eee-eh","vars":[{"label":"base","bracket":"fiat","just_part":""}],"eng_variants":["fiat"]},{"segment_id":1021,"unit":"Whīā","unit_norm":"whīā","ipa":"fiːːɑːː","phonetic":"f-eee-ahh","vars":[{"label":"base","bracket":"fiat","just_part":""}],"eng_variants":["fiat"]},{"segment_id":1020,"unit":"Whiā","unit_norm":"whiā","ipa":"fiːɑːː","phonetic":"f-ee-ahh","vars":[{"label":"base","bracket":"fiat","just_part":""}],"eng_variants":["fiat"]},{"segment_id":1019,"unit":"Whīa","unit_norm":"whīa","ipa":"fiːːɑ","phonetic":"f-eee-ah","vars":[],"eng_variants":[]},{"segment_id":1018,"unit":"Whēū","unit_norm":"whēū","ipa":"fɛːuː","phonetic":"f-ehh-ooh","vars":[{"label":"base","bracket":"feud","just_part":""}],"eng_variants":["feud"]},{"segment_id":1017,"unit":"Wheū","unit_norm":"wheū","ipa":"fɛhuː","phonetic":"f-eh-ooh","vars":[],"eng_variants":[]},{"segment_id":1016,"unit":"Whēu","unit_norm":"whēu","ipa":"fɛːʊː","phonetic":"f-ehh-ew","vars":[],"eng_variants":[]},{"segment_id":1015,"unit":"Whēō","unit_norm":"whēō","ipa":"fɛːɔːr","phonetic":"f-ehh-or","vars":[],"eng_variants":[]},{"segment_id":1014,"unit":"Wheō","unit_norm":"wheō","ipa":"fɛhɔːr","phonetic":"f-eh-or","vars":[],"eng_variants":[]},{"segment_id":1013,"unit":"Whēo","unit_norm":"whēo","ipa":"fɛːɔː","phonetic":"f-ehh-aw","vars":[],"eng_variants":[]},{"segment_id":1012,"unit":"Whēī","unit_norm":"whēī","ipa":"fɛːiːː","phonetic":"f-ehh-eee","vars":[],"eng_variants":[]},{"segment_id":1011,"unit":"Wheī","unit_norm":"wheī","ipa":"fɛhiːː","phonetic":"f-eh-eee","vars":[],"eng_variants":[]},{"segment_id":1010,"unit":"Whēi","unit_norm":"whēi","ipa":"fɛːiː","phonetic":"f-ehh-ee","vars":[],"eng_variants":[]},{"segment_id":1009,"unit":"Whēē","unit_norm":"whēē","ipa":"fɛːɛː","phonetic":"f-ehh-ehh","vars":[],"eng_variants":[]},{"segment_id":1008,"unit":"Whēe","unit_norm":"whēe","ipa":"fɛːɛh","phonetic":"f-ehh-eh","vars":[],"eng_variants":[]},{"segment_id":1007,"unit":"Whēā","unit_norm":"whēā","ipa":"fɛːɑːː","phonetic":"f-ehh-ahh","vars":[],"eng_variants":[]},{"segment_id":1006,"unit":"Wheā","unit_norm":"wheā","ipa":"fɛhɑːː","phonetic":"f-eh-ahh","vars":[],"eng_variants":[]},{"segment_id":1005,"unit":"Whēa","unit_norm":"whēa","ipa":"fɛːɑ","phonetic":"f-ehh-ah","vars":[],"eng_variants":[]},{"segment_id":1004,"unit":"Whāū","unit_norm":"whāū","ipa":"fɑːːuː","phonetic":"f-ahh-ooh","vars":[],"eng_variants":[]},{"segment_id":1003,"unit":"Whaū","unit_norm":"whaū","ipa":"fɑuː","phonetic":"f-ah-ooh","vars":[],"eng_variants":[]},{"segment_id":1002,"unit":"Whāu","unit_norm":"whāu","ipa":"fɑːːʊː","phonetic":"f-ahh-ew","vars":[],"eng_variants":[]},{"segment_id":1001,"unit":"Whāō","unit_norm":"whāō","ipa":"fɑːːɔːr","phonetic":"f-ahh-or","vars":[],"eng_variants":[]},{"segment_id":1000,"unit":"Whaō","unit_norm":"whaō","ipa":"fɑɔːr","phonetic":"f-ah-or","vars":[],"eng_variants":[]},{"segment_id":999,"unit":"Whāo","unit_norm":"whāo","ipa":"fɑːːɔː","phonetic":"f-ahh-aw","vars":[],"eng_variants":[]},{"segment_id":998,"unit":"Whāī","unit_norm":"whāī","ipa":"fɑːːiːː","phonetic":"f-ahh-eee","vars":[],"eng_variants":[]},{"segment_id":997,"unit":"Whaī","unit_norm":"whaī","ipa":"fɑiːː","phonetic":"f-ah-eee","vars":[],"eng_variants":[]},{"segment_id":996,"unit":"Whāi","unit_norm":"whāi","ipa":"fɑːːiː","phonetic":"f-ahh-ee","vars":[],"eng_variants":[]},{"segment_id":995,"unit":"Whāē","unit_norm":"whāē","ipa":"fɑːːɛː","phonetic":"f-ahh-ehh","vars":[],"eng_variants":[]},{"segment_id":994,"unit":"Whāe","unit_norm":"whāe","ipa":"fɑːːɛh","phonetic":"f-ahh-eh","vars":[],"eng_variants":[]},{"segment_id":993,"unit":"Whāā","unit_norm":"whāā","ipa":"fɑːːɑːː","phonetic":"f-ahh-ahh","vars":[],"eng_variants":[]},{"segment_id":992,"unit":"Whaā","unit_norm":"whaā","ipa":"fɑɑːː","phonetic":"f-ah-ahh","vars":[],"eng_variants":[]},{"segment_id":991,"unit":"Whāa","unit_norm":"whāa","ipa":"fɑːːɑ","phonetic":"f-ahh-ah","vars":[],"eng_variants":[]},{"segment_id":990,"unit":"Whuu","unit_norm":"whuu","ipa":"fʊːʊː","phonetic":"f-ew-ew","vars":[],"eng_variants":[]},{"segment_id":989,"unit":"Whuo","unit_norm":"whuo","ipa":"fʊːɔː","phonetic":"f-ew-aw","vars":[],"eng_variants":[]},{"segment_id":988,"unit":"Whui","unit_norm":"whui","ipa":"fʊːiː","phonetic":"f-ew-ee","vars":[],"eng_variants":[]},{"segment_id":987,"unit":"Whue","unit_norm":"whue","ipa":"fʊːɛh","phonetic":"f-ew-eh","vars":[],"eng_variants":[]},{"segment_id":986,"unit":"Whua","unit_norm":"whua","ipa":"fʊːɑ","phonetic":"f-ew-ah","vars":[],"eng_variants":[]},{"segment_id":985,"unit":"Whou","unit_norm":"whou","ipa":"fɔːʊː","phonetic":"f-aw-ew","vars":[],"eng_variants":[]},{"segment_id":984,"unit":"Whoo","unit_norm":"whoo","ipa":"fɔːɔː","phonetic":"f-aw-aw","vars":[],"eng_variants":[]},{"segment_id":983,"unit":"Whoi","unit_norm":"whoi","ipa":"fɔːiː","phonetic":"f-aw-ee","vars":[],"eng_variants":[]},{"segment_id":982,"unit":"Whoe","unit_norm":"whoe","ipa":"fɔːɛh","phonetic":"f-aw-eh","vars":[],"eng_variants":[]},{"segment_id":981,"unit":"Whoa","unit_norm":"whoa","ipa":"fɔːɑ","phonetic":"f-aw-ah","vars":[],"eng_variants":[]},{"segment_id":980,"unit":"Whiu","unit_norm":"whiu","ipa":"fiːʊː","phonetic":"f-ee-ew","vars":[],"eng_variants":[]},{"segment_id":979,"unit":"Whio","unit_norm":"whio","ipa":"fiːɔː","phonetic":"f-ee-aw","vars":[],"eng_variants":[]},{"segment_id":978,"unit":"Whii","unit_norm":"whii","ipa":"fiːiː","phonetic":"f-ee-ee","vars":[],"eng_variants":[]},{"segment_id":977,"unit":"Whie","unit_norm":"whie","ipa":"fiːɛh","phonetic":"f-ee-eh","vars":[],"eng_variants":[]},{"segment_id":976,"unit":"Whia","unit_norm":"whia","ipa":"fiːɑ","phonetic":"f-ee-ah","vars":[],"eng_variants":[]},{"segment_id":975,"unit":"Wheu","unit_norm":"wheu","ipa":"fɛhʊː","phonetic":"f-eh-ew","vars":[],"eng_variants":[]},{"segment_id":974,"unit":"Wheo","unit_norm":"wheo","ipa":"fɛhɔː","phonetic":"f-eh-aw","vars":[],"eng_variants":[]},{"segment_id":973,"unit":"Whei","unit_norm":"whei","ipa":"fɛhiː","phonetic":"f-eh-ee","vars":[],"eng_variants":[]},{"segment_id":972,"unit":"Whee","unit_norm":"whee","ipa":"fɛhɛh","phonetic":"f-eh-eh","vars":[],"eng_variants":[]},{"segment_id":971,"unit":"Whea","unit_norm":"whea","ipa":"fɛhɑ","phonetic":"f-eh-ah","vars":[],"eng_variants":[]},{"segment_id":970,"unit":"Whau","unit_norm":"whau","ipa":"fɑʊː","phonetic":"f-ah-ew","vars":[],"eng_variants":[]},{"segment_id":969,"unit":"Whao","unit_norm":"whao","ipa":"fɑɔː","phonetic":"f-ah-aw","vars":[],"eng_variants":[]},{"segment_id":968,"unit":"Whai","unit_norm":"whai","ipa":"fɑiː","phonetic":"f-ah-ee","vars":[],"eng_variants":[]},{"segment_id":967,"unit":"Whae","unit_norm":"whae","ipa":"fɑɛh","phonetic":"f-ah-eh","vars":[],"eng_variants":[]},{"segment_id":966,"unit":"Whaa","unit_norm":"whaa","ipa":"fɑɑ","phonetic":"f-ah-ah","vars":[],"eng_variants":[]},{"segment_id":965,"unit":"Whū","unit_norm":"whū","ipa":"fuː","phonetic":"f-ooh","vars":[],"eng_variants":[]},{"segment_id":964,"unit":"Whō","unit_norm":"whō","ipa":"fɔːr","phonetic":"f-or","vars":[],"eng_variants":[]},{"segment_id":963,"unit":"Whī","unit_norm":"whī","ipa":"fiːː","phonetic":"f-eee","vars":[],"eng_variants":[]},{"segment_id":962,"unit":"Whē","unit_norm":"whē","ipa":"fɛː","phonetic":"f-ehh","vars":[],"eng_variants":[]},{"segment_id":961,"unit":"Whā","unit_norm":"whā","ipa":"fɑːː","phonetic":"f-ahh","vars":[],"eng_variants":[]},{"segment_id":960,"unit":"Whu","unit_norm":"whu","ipa":"fʊː","phonetic":"f-ew","vars":[],"eng_variants":[]},{"segment_id":959,"unit":"Who","unit_norm":"who","ipa":"fɔː","phonetic":"f-aw","vars":[],"eng_variants":[]},{"segment_id":958,"unit":"Whi","unit_norm":"whi","ipa":"fiː","phonetic":"f-ee","vars":[],"eng_variants":[]},{"segment_id":957,"unit":"Whe","unit_norm":"whe","ipa":"fɛh","phonetic":"f-eh","vars":[],"eng_variants":[]},{"segment_id":956,"unit":"Wha","unit_norm":"wha","ipa":"fɑ","phonetic":"f-ah","vars":[],"eng_variants":[]},{"segment_id":955,"unit":"Wūū","unit_norm":"wūū","ipa":"wuːuː","phonetic":"w-ooh-ooh","vars":[],"eng_variants":[]},{"segment_id":954,"unit":"Wuū","unit_norm":"wuū","ipa":"wʊːuː","phonetic":"w-ew-ooh","vars":[],"eng_variants":[]},{"segment_id":953,"unit":"Wūu","unit_norm":"wūu","ipa":"wuːʊː","phonetic":"w-ooh-ew","vars":[],"eng_variants":[]},{"segment_id":952,"unit":"Wūō","unit_norm":"wūō","ipa":"wuːɔːr","phonetic":"w-ooh-or","vars":[],"eng_variants":[]},{"segment_id":951,"unit":"Waō","unit_norm":"waō","ipa":"wɑɔːr","phonetic":"w-ah-or","vars":[],"eng_variants":[]},{"segment_id":950,"unit":"Wūo","unit_norm":"wūo","ipa":"wuːɔː","phonetic":"w-ooh-aw","vars":[],"eng_variants":[]},{"segment_id":949,"unit":"Wūī","unit_norm":"wūī","ipa":"wuːiːː","phonetic":"w-ooh-eee","vars":[],"eng_variants":[]},{"segment_id":948,"unit":"Wuī","unit_norm":"wuī","ipa":"wʊːiːː","phonetic":"w-ew-eee","vars":[],"eng_variants":[]},{"segment_id":947,"unit":"Wūi","unit_norm":"wūi","ipa":"wuːiː","phonetic":"w-ooh-ee","vars":[],"eng_variants":[]},{"segment_id":946,"unit":"Wūē","unit_norm":"wūē","ipa":"wuːɛː","phonetic":"w-ooh-ehh","vars":[],"eng_variants":[]},{"segment_id":945,"unit":"Wūe","unit_norm":"wūe","ipa":"wuːɛh","phonetic":"w-ooh-eh","vars":[],"eng_variants":[]},{"segment_id":944,"unit":"Wūā","unit_norm":"wūā","ipa":"wuːɑːː","phonetic":"w-ooh-ahh","vars":[],"eng_variants":[]},{"segment_id":943,"unit":"Wuā","unit_norm":"wuā","ipa":"wʊːɑːː","phonetic":"w-ew-ahh","vars":[],"eng_variants":[]},{"segment_id":942,"unit":"Wūa","unit_norm":"wūa","ipa":"wuːɑ","phonetic":"w-ooh-ah","vars":[],"eng_variants":[]},{"segment_id":941,"unit":"Wōū","unit_norm":"wōū","ipa":"wɔːruː","phonetic":"w-or-ooh","vars":[],"eng_variants":[]},{"segment_id":940,"unit":"Woū","unit_norm":"woū","ipa":"wɔːuː","phonetic":"w-aw-ooh","vars":[],"eng_variants":[]},{"segment_id":939,"unit":"Wōu","unit_norm":"wōu","ipa":"wɔːrʊː","phonetic":"w-or-ew","vars":[],"eng_variants":[]},{"segment_id":938,"unit":"Wōō","unit_norm":"wōō","ipa":"wɔːrɔːr","phonetic":"w-or-or","vars":[],"eng_variants":[]},{"segment_id":937,"unit":"Woō","unit_norm":"woō","ipa":"wɔːɔːr","phonetic":"w-aw-or","vars":[],"eng_variants":[]},{"segment_id":936,"unit":"Wōo","unit_norm":"wōo","ipa":"wɔːrɔː","phonetic":"w-or-aw","vars":[],"eng_variants":[]},{"segment_id":935,"unit":"Wōī","unit_norm":"wōī","ipa":"wɔːriːː","phonetic":"w-or-eee","vars":[],"eng_variants":[]},{"segment_id":934,"unit":"Woī","unit_norm":"woī","ipa":"wɔːiːː","phonetic":"w-aw-eee","vars":[],"eng_variants":[]},{"segment_id":933,"unit":"Wōi","unit_norm":"wōi","ipa":"wɔːriː","phonetic":"w-or-ee","vars":[],"eng_variants":[]},{"segment_id":932,"unit":"Wōē","unit_norm":"wōē","ipa":"wɔːrɛː","phonetic":"w-or-ehh","vars":[],"eng_variants":[]},{"segment_id":931,"unit":"Wōe","unit_norm":"wōe","ipa":"wɔːrɛh","phonetic":"w-or-eh","vars":[],"eng_variants":[]},{"segment_id":930,"unit":"Wōā","unit_norm":"wōā","ipa":"wɔːrɑːː","phonetic":"w-or-ahh","vars":[],"eng_variants":[]},{"segment_id":929,"unit":"Woā","unit_norm":"woā","ipa":"wɔːɑːː","phonetic":"w-aw-ahh","vars":[],"eng_variants":[]},{"segment_id":928,"unit":"Wōa","unit_norm":"wōa","ipa":"wɔːrɑ","phonetic":"w-or-ah","vars":[],"eng_variants":[]},{"segment_id":927,"unit":"Wīū","unit_norm":"wīū","ipa":"wiːːuː","phonetic":"w-eee-ooh","vars":[],"eng_variants":[]},{"segment_id":926,"unit":"Wiū","unit_norm":"wiū","ipa":"wiːuː","phonetic":"w-ee-ooh","vars":[],"eng_variants":[]},{"segment_id":925,"unit":"Wīu","unit_norm":"wīu","ipa":"wiːːʊː","phonetic":"w-eee-ew","vars":[],"eng_variants":[]},{"segment_id":924,"unit":"Wīō","unit_norm":"wīō","ipa":"wiːːɔːr","phonetic":"w-eee-or","vars":[],"eng_variants":[]},{"segment_id":923,"unit":"Wiō","unit_norm":"wiō","ipa":"wiːɔːr","phonetic":"w-ee-or","vars":[],"eng_variants":[]},{"segment_id":922,"unit":"Wīo","unit_norm":"wīo","ipa":"wiːːɔː","phonetic":"w-eee-aw","vars":[],"eng_variants":[]},{"segment_id":921,"unit":"Wīī","unit_norm":"wīī","ipa":"wiːːiːː","phonetic":"w-eee-eee","vars":[],"eng_variants":[]},{"segment_id":920,"unit":"Wiī","unit_norm":"wiī","ipa":"wiːiːː","phonetic":"w-ee-eee","vars":[],"eng_variants":[]},{"segment_id":919,"unit":"Wīi","unit_norm":"wīi","ipa":"wiːːiː","phonetic":"w-eee-ee","vars":[],"eng_variants":[]},{"segment_id":918,"unit":"Wīē","unit_norm":"wīē","ipa":"wiːːɛː","phonetic":"w-eee-ehh","vars":[],"eng_variants":[]},{"segment_id":917,"unit":"Wīe","unit_norm":"wīe","ipa":"wiːːɛh","phonetic":"w-eee-eh","vars":[],"eng_variants":[]},{"segment_id":916,"unit":"Wīā","unit_norm":"wīā","ipa":"wiːːɑːː","phonetic":"w-eee-ahh","vars":[{"label":"base","bracket":"(where)","just_part":"where"}],"eng_variants":["(where)"]},{"segment_id":915,"unit":"Wiā","unit_norm":"wiā","ipa":"wiːɑːː","phonetic":"w-ee-ahh","vars":[],"eng_variants":[]},{"segment_id":914,"unit":"Wīa","unit_norm":"wīa","ipa":"wiːːɑ","phonetic":"w-eee-ah","vars":[],"eng_variants":[]},{"segment_id":913,"unit":"Wēū","unit_norm":"wēū","ipa":"wɛːuː","phonetic":"w-ehh-ooh","vars":[],"eng_variants":[]},{"segment_id":912,"unit":"Weū","unit_norm":"weū","ipa":"wɛhuː","phonetic":"w-eh-ooh","vars":[],"eng_variants":[]},{"segment_id":911,"unit":"Wēu","unit_norm":"wēu","ipa":"wɛːʊː","phonetic":"w-ehh-ew","vars":[],"eng_variants":[]},{"segment_id":910,"unit":"Wēō","unit_norm":"wēō","ipa":"wɛːɔːr","phonetic":"w-ehh-or","vars":[],"eng_variants":[]},{"segment_id":909,"unit":"Weō","unit_norm":"weō","ipa":"wɛhɔːr","phonetic":"w-eh-or","vars":[],"eng_variants":[]},{"segment_id":908,"unit":"Wēo","unit_norm":"wēo","ipa":"wɛːɔː","phonetic":"w-ehh-aw","vars":[],"eng_variants":[]},{"segment_id":907,"unit":"Wēī","unit_norm":"wēī","ipa":"wɛːiːː","phonetic":"w-ehh-eee","vars":[],"eng_variants":[]},{"segment_id":906,"unit":"Weī","unit_norm":"weī","ipa":"wɛhiːː","phonetic":"w-eh-eee","vars":[],"eng_variants":[]},{"segment_id":905,"unit":"Wēi","unit_norm":"wēi","ipa":"wɛːiː","phonetic":"w-ehh-ee","vars":[],"eng_variants":[]},{"segment_id":904,"unit":"Wēē","unit_norm":"wēē","ipa":"wɛːɛː","phonetic":"w-ehh-ehh","vars":[],"eng_variants":[]},{"segment_id":903,"unit":"Wēe","unit_norm":"wēe","ipa":"wɛːɛh","phonetic":"w-ehh-eh","vars":[],"eng_variants":[]},{"segment_id":902,"unit":"Wēā","unit_norm":"wēā","ipa":"wɛːɑːː","phonetic":"w-ehh-ahh","vars":[],"eng_variants":[]},{"segment_id":901,"unit":"Weā","unit_norm":"weā","ipa":"wɛhɑːː","phonetic":"w-eh-ahh","vars":[],"eng_variants":[]},{"segment_id":900,"unit":"Wēa","unit_norm":"wēa","ipa":"wɛːɑ","phonetic":"w-ehh-ah","vars":[],"eng_variants":[]},{"segment_id":899,"unit":"Wāū","unit_norm":"wāū","ipa":"wɑːːuː","phonetic":"w-ahh-ooh","vars":[],"eng_variants":[]},{"segment_id":898,"unit":"Waū","unit_norm":"waū","ipa":"wɑuː","phonetic":"w-ah-ooh","vars":[],"eng_variants":[]},{"segment_id":897,"unit":"Wāu","unit_norm":"wāu","ipa":"wɑːːʊː","phonetic":"w-ahh-ew","vars":[],"eng_variants":[]},{"segment_id":896,"unit":"Wāō","unit_norm":"wāō","ipa":"wɑːːɔːr","phonetic":"w-ahh-or","vars":[],"eng_variants":[]},{"segment_id":895,"unit":"Waō","unit_norm":"waō","ipa":"wɑɔːr","phonetic":"w-ah-or","vars":[],"eng_variants":[]},{"segment_id":894,"unit":"Wāo","unit_norm":"wāo","ipa":"wɑːːɔː","phonetic":"w-ahh-aw","vars":[],"eng_variants":[]},{"segment_id":893,"unit":"Wāī","unit_norm":"wāī","ipa":"wɑːːiːː","phonetic":"w-ahh-eee","vars":[],"eng_variants":[]},{"segment_id":892,"unit":"Waī","unit_norm":"waī","ipa":"wɑiːː","phonetic":"w-ah-eee","vars":[],"eng_variants":[]},{"segment_id":891,"unit":"Wāi","unit_norm":"wāi","ipa":"wɑːːiː","phonetic":"w-ahh-ee","vars":[],"eng_variants":[]},{"segment_id":890,"unit":"Wāē","unit_norm":"wāē","ipa":"wɑːːɛː","phonetic":"w-ahh-ehh","vars":[],"eng_variants":[]},{"segment_id":889,"unit":"Wāe","unit_norm":"wāe","ipa":"wɑːːɛh","phonetic":"w-ahh-eh","vars":[],"eng_variants":[]},{"segment_id":888,"unit":"Wāā","unit_norm":"wāā","ipa":"wɑːːɑːː","phonetic":"w-ahh-ahh","vars":[],"eng_variants":[]},{"segment_id":887,"unit":"Waā","unit_norm":"waā","ipa":"wɑɑːː","phonetic":"w-ah-ahh","vars":[],"eng_variants":[]},{"segment_id":886,"unit":"Wāa","unit_norm":"wāa","ipa":"wɑːːɑ","phonetic":"w-ahh-ah","vars":[],"eng_variants":[]},{"segment_id":885,"unit":"Wuu","unit_norm":"wuu","ipa":"wʊːʊː","phonetic":"w-ew-ew","vars":[],"eng_variants":[]},{"segment_id":884,"unit":"Wuo","unit_norm":"wuo","ipa":"wʊːɔː","phonetic":"w-ew-aw","vars":[],"eng_variants":[]},{"segment_id":883,"unit":"Wui","unit_norm":"wui","ipa":"wʊːiː","phonetic":"w-ew-ee","vars":[],"eng_variants":[]},{"segment_id":882,"unit":"Wue","unit_norm":"wue","ipa":"wʊːɛh","phonetic":"w-ew-eh","vars":[],"eng_variants":[]},{"segment_id":881,"unit":"Wua","unit_norm":"wua","ipa":"wʊːɑ","phonetic":"w-ew-ah","vars":[],"eng_variants":[]},{"segment_id":880,"unit":"Wou","unit_norm":"wou","ipa":"wɔːʊː","phonetic":"w-aw-ew","vars":[],"eng_variants":[]},{"segment_id":879,"unit":"Woo","unit_norm":"woo","ipa":"wɔːɔː","phonetic":"w-aw-aw","vars":[],"eng_variants":[]},{"segment_id":878,"unit":"Woi","unit_norm":"woi","ipa":"wɔːiː","phonetic":"w-aw-ee","vars":[],"eng_variants":[]},{"segment_id":877,"unit":"Woe","unit_norm":"woe","ipa":"wɔːɛh","phonetic":"w-aw-eh","vars":[],"eng_variants":[]},{"segment_id":876,"unit":"Woa","unit_norm":"woa","ipa":"wɔːɑ","phonetic":"w-aw-ah","vars":[],"eng_variants":[]},{"segment_id":875,"unit":"Wiu","unit_norm":"wiu","ipa":"wiːʊː","phonetic":"w-ee-ew","vars":[],"eng_variants":[]},{"segment_id":874,"unit":"Wio","unit_norm":"wio","ipa":"wiːɔː","phonetic":"w-ee-aw","vars":[],"eng_variants":[]},{"segment_id":873,"unit":"Wii","unit_norm":"wii","ipa":"wiːiː","phonetic":"w-ee-ee","vars":[],"eng_variants":[]},{"segment_id":872,"unit":"Wie","unit_norm":"wie","ipa":"wiːɛh","phonetic":"w-ee-eh","vars":[],"eng_variants":[]},{"segment_id":871,"unit":"Wia","unit_norm":"wia","ipa":"wiːɑ","phonetic":"w-ee-ah","vars":[],"eng_variants":[]},{"segment_id":870,"unit":"Weu","unit_norm":"weu","ipa":"wɛhʊː","phonetic":"w-eh-ew","vars":[],"eng_variants":[]},{"segment_id":869,"unit":"Weo","unit_norm":"weo","ipa":"wɛhɔː","phonetic":"w-eh-aw","vars":[],"eng_variants":[]},{"segment_id":868,"unit":"Wei","unit_norm":"wei","ipa":"wɛhiː","phonetic":"w-eh-ee","vars":[],"eng_variants":[]},{"segment_id":867,"unit":"Wee","unit_norm":"wee","ipa":"wɛhɛh","phonetic":"w-eh-eh","vars":[],"eng_variants":[]},{"segment_id":866,"unit":"Wea","unit_norm":"wea","ipa":"wɛhɑ","phonetic":"w-eh-ah","vars":[],"eng_variants":[]},{"segment_id":865,"unit":"Wau","unit_norm":"wau","ipa":"wɑʊː","phonetic":"w-ah-ew","vars":[],"eng_variants":[]},{"segment_id":864,"unit":"Wao","unit_norm":"wao","ipa":"wɑɔː","phonetic":"w-ah-aw","vars":[],"eng_variants":[]},{"segment_id":863,"unit":"Wai","unit_norm":"wai","ipa":"wɑiː","phonetic":"w-ah-ee","vars":[],"eng_variants":[]},{"segment_id":862,"unit":"Wae","unit_norm":"wae","ipa":"wɑɛh","phonetic":"w-ah-eh","vars":[],"eng_variants":[]},{"segment_id":861,"unit":"Waa","unit_norm":"waa","ipa":"wɑɑ","phonetic":"w-ah-ah","vars":[],"eng_variants":[]},{"segment_id":860,"unit":"Wū","unit_norm":"wū","ipa":"wuː","phonetic":"w-ooh","vars":[],"eng_variants":[]},{"segment_id":859,"unit":"Wō","unit_norm":"wō","ipa":"wɔːr","phonetic":"w-or","vars":[],"eng_variants":[]},{"segment_id":858,"unit":"Wī","unit_norm":"wī","ipa":"wiːː","phonetic":"w-eee","vars":[],"eng_variants":[]},{"segment_id":857,"unit":"Wē","unit_norm":"wē","ipa":"wɛː","phonetic":"w-ehh","vars":[],"eng_variants":[]},{"segment_id":856,"unit":"Wā","unit_norm":"wā","ipa":"wɑːː","phonetic":"w-ahh","vars":[],"eng_variants":[]},{"segment_id":855,"unit":"Wu","unit_norm":"wu","ipa":"wʊː","phonetic":"w-ew","vars":[],"eng_variants":[]},{"segment_id":854,"unit":"Wo","unit_norm":"wo","ipa":"wɔː","phonetic":"w-aw","vars":[],"eng_variants":[]},{"segment_id":853,"unit":"Wi","unit_norm":"wi","ipa":"wiː","phonetic":"w-ee","vars":[],"eng_variants":[]},{"segment_id":852,"unit":"We","unit_norm":"we","ipa":"wɛh","phonetic":"w-eh","vars":[],"eng_variants":[]},{"segment_id":851,"unit":"Wa","unit_norm":"wa","ipa":"wɑ","phonetic":"w-ah","vars":[],"eng_variants":[]},{"segment_id":850,"unit":"Tūū","unit_norm":"tūū","ipa":"tuːuː","phonetic":"t-ooh-ooh","vars":[],"eng_variants":[]},{"segment_id":849,"unit":"Tuū","unit_norm":"tuū","ipa":"tʊːuː","phonetic":"t-ew-ooh","vars":[],"eng_variants":[]},{"segment_id":848,"unit":"Tūu","unit_norm":"tūu","ipa":"tuːʊː","phonetic":"t-ooh-ew","vars":[],"eng_variants":[]},{"segment_id":847,"unit":"Tūō","unit_norm":"tūō","ipa":"tuːɔːr","phonetic":"t-ooh-or","vars":[],"eng_variants":[]},{"segment_id":846,"unit":"Taō","unit_norm":"taō","ipa":"tɑɔːr","phonetic":"t-ah-or","vars":[],"eng_variants":[]},{"segment_id":845,"unit":"Tūo","unit_norm":"tūo","ipa":"tuːɔː","phonetic":"t-ooh-aw","vars":[],"eng_variants":[]},{"segment_id":844,"unit":"Tūī","unit_norm":"tūī","ipa":"tuːiːː","phonetic":"t-ooh-eee","vars":[],"eng_variants":[]},{"segment_id":843,"unit":"Tuī","unit_norm":"tuī","ipa":"tʊːiːː","phonetic":"t-ew-eee","vars":[],"eng_variants":[]},{"segment_id":842,"unit":"Tūi","unit_norm":"tūi","ipa":"tuːiː","phonetic":"t-ooh-ee","vars":[],"eng_variants":[]},{"segment_id":841,"unit":"Tūē","unit_norm":"tūē","ipa":"tuːɛː","phonetic":"t-ooh-ehh","vars":[],"eng_variants":[]},{"segment_id":840,"unit":"Tūe","unit_norm":"tūe","ipa":"tuːɛh","phonetic":"t-ooh-eh","vars":[],"eng_variants":[]},{"segment_id":839,"unit":"Tūā","unit_norm":"tūā","ipa":"tuːɑːː","phonetic":"t-ooh-ahh","vars":[],"eng_variants":[]},{"segment_id":838,"unit":"Tuā","unit_norm":"tuā","ipa":"tʊːɑːː","phonetic":"t-ew-ahh","vars":[],"eng_variants":[]},{"segment_id":837,"unit":"Tūa","unit_norm":"tūa","ipa":"tuːɑ","phonetic":"t-ooh-ah","vars":[],"eng_variants":[]},{"segment_id":836,"unit":"Tōū","unit_norm":"tōū","ipa":"tɔːruː","phonetic":"t-or-ooh","vars":[],"eng_variants":[]},{"segment_id":835,"unit":"Toū","unit_norm":"toū","ipa":"tɔːuː","phonetic":"t-aw-ooh","vars":[],"eng_variants":[]},{"segment_id":834,"unit":"Tōu","unit_norm":"tōu","ipa":"tɔːrʊː","phonetic":"t-or-ew","vars":[],"eng_variants":[]},{"segment_id":833,"unit":"Tōō","unit_norm":"tōō","ipa":"tɔːrɔːr","phonetic":"t-or-or","vars":[],"eng_variants":[]},{"segment_id":832,"unit":"Toō","unit_norm":"toō","ipa":"tɔːɔːr","phonetic":"t-aw-or","vars":[],"eng_variants":[]},{"segment_id":831,"unit":"Tōo","unit_norm":"tōo","ipa":"tɔːrɔː","phonetic":"t-or-aw","vars":[],"eng_variants":[]},{"segment_id":830,"unit":"Tōī","unit_norm":"tōī","ipa":"tɔːriːː","phonetic":"t-or-eee","vars":[],"eng_variants":[]},{"segment_id":829,"unit":"Toī","unit_norm":"toī","ipa":"tɔːiːː","phonetic":"t-aw-eee","vars":[],"eng_variants":[]},{"segment_id":828,"unit":"Tōi","unit_norm":"tōi","ipa":"tɔːriː","phonetic":"t-or-ee","vars":[],"eng_variants":[]},{"segment_id":827,"unit":"Tōē","unit_norm":"tōē","ipa":"tɔːrɛː","phonetic":"t-or-ehh","vars":[],"eng_variants":[]},{"segment_id":826,"unit":"Tōe","unit_norm":"tōe","ipa":"tɔːrɛh","phonetic":"t-or-eh","vars":[],"eng_variants":[]},{"segment_id":825,"unit":"Tōā","unit_norm":"tōā","ipa":"tɔːrɑːː","phonetic":"t-or-ahh","vars":[],"eng_variants":[]},{"segment_id":824,"unit":"Toā","unit_norm":"toā","ipa":"tɔːɑːː","phonetic":"t-aw-ahh","vars":[],"eng_variants":[]},{"segment_id":823,"unit":"Tōa","unit_norm":"tōa","ipa":"tɔːrɑ","phonetic":"t-or-ah","vars":[],"eng_variants":[]},{"segment_id":822,"unit":"Tīū","unit_norm":"tīū","ipa":"tiːːuː","phonetic":"t-eee-ooh","vars":[],"eng_variants":[]},{"segment_id":821,"unit":"Tiū","unit_norm":"tiū","ipa":"tiːuː","phonetic":"t-ee-ooh","vars":[],"eng_variants":[]},{"segment_id":820,"unit":"Tīu","unit_norm":"tīu","ipa":"tiːːʊː","phonetic":"t-eee-ew","vars":[],"eng_variants":[]},{"segment_id":819,"unit":"Tīō","unit_norm":"tīō","ipa":"tiːːɔːr","phonetic":"t-eee-or","vars":[],"eng_variants":[]},{"segment_id":818,"unit":"Tiō","unit_norm":"tiō","ipa":"tiːɔːr","phonetic":"t-ee-or","vars":[],"eng_variants":[]},{"segment_id":817,"unit":"Tīo","unit_norm":"tīo","ipa":"tiːːɔː","phonetic":"t-eee-aw","vars":[],"eng_variants":[]},{"segment_id":816,"unit":"Tīī","unit_norm":"tīī","ipa":"tiːːiːː","phonetic":"t-eee-eee","vars":[],"eng_variants":[]},{"segment_id":815,"unit":"Tiī","unit_norm":"tiī","ipa":"tiːiːː","phonetic":"t-ee-eee","vars":[{"label":"v1","bracket":"(tea)","just_part":"tea"},{"label":"v2","bracket":"(tee)","just_part":"tee"}],"eng_variants":["(tea)","(tee)"]},{"segment_id":814,"unit":"Tīi","unit_norm":"tīi","ipa":"tiːːiː","phonetic":"t-eee-ee","vars":[],"eng_variants":[]},{"segment_id":813,"unit":"Tīē","unit_norm":"tīē","ipa":"tiːːɛː","phonetic":"t-eee-ehh","vars":[],"eng_variants":[]},{"segment_id":812,"unit":"Tīe","unit_norm":"tīe","ipa":"tiːːɛh","phonetic":"t-eee-eh","vars":[],"eng_variants":[]},{"segment_id":811,"unit":"Tīā","unit_norm":"tīā","ipa":"tiːːɑːː","phonetic":"t-eee-ahh","vars":[],"eng_variants":[]},{"segment_id":810,"unit":"Tiā","unit_norm":"tiā","ipa":"tiːɑːː","phonetic":"t-ee-ahh","vars":[{"label":"v1","bracket":"(tear)","just_part":"tear"}],"eng_variants":["(tear)"]},{"segment_id":809,"unit":"Tīa","unit_norm":"tīa","ipa":"tiːːɑ","phonetic":"t-eee-ah","vars":[],"eng_variants":[]},{"segment_id":808,"unit":"Tēū","unit_norm":"tēū","ipa":"tɛːuː","phonetic":"t-ehh-ooh","vars":[],"eng_variants":[]},{"segment_id":807,"unit":"Teū","unit_norm":"teū","ipa":"tɛhuː","phonetic":"t-eh-ooh","vars":[],"eng_variants":[]},{"segment_id":806,"unit":"Tēu","unit_norm":"tēu","ipa":"tɛːʊː","phonetic":"t-ehh-ew","vars":[],"eng_variants":[]},{"segment_id":805,"unit":"Tēō","unit_norm":"tēō","ipa":"tɛːɔːr","phonetic":"t-ehh-or","vars":[],"eng_variants":[]},{"segment_id":804,"unit":"Teō","unit_norm":"teō","ipa":"tɛhɔːr","phonetic":"t-eh-or","vars":[],"eng_variants":[]},{"segment_id":803,"unit":"Tēo","unit_norm":"tēo","ipa":"tɛːɔː","phonetic":"t-ehh-aw","vars":[],"eng_variants":[]},{"segment_id":802,"unit":"Tēī","unit_norm":"tēī","ipa":"tɛːiːː","phonetic":"t-ehh-eee","vars":[],"eng_variants":[]},{"segment_id":801,"unit":"Teī","unit_norm":"teī","ipa":"tɛhiːː","phonetic":"t-eh-eee","vars":[],"eng_variants":[]},{"segment_id":800,"unit":"Tēi","unit_norm":"tēi","ipa":"tɛːiː","phonetic":"t-ehh-ee","vars":[],"eng_variants":[]},{"segment_id":799,"unit":"Tēē","unit_norm":"tēē","ipa":"tɛːɛː","phonetic":"t-ehh-ehh","vars":[],"eng_variants":[]},{"segment_id":798,"unit":"Tēe","unit_norm":"tēe","ipa":"tɛːɛh","phonetic":"t-ehh-eh","vars":[],"eng_variants":[]},{"segment_id":797,"unit":"Tēā","unit_norm":"tēā","ipa":"tɛːɑːː","phonetic":"t-ehh-ahh","vars":[],"eng_variants":[]},{"segment_id":796,"unit":"Teā","unit_norm":"teā","ipa":"tɛhɑːː","phonetic":"t-eh-ahh","vars":[],"eng_variants":[]},{"segment_id":795,"unit":"Tēa","unit_norm":"tēa","ipa":"tɛːɑ","phonetic":"t-ehh-ah","vars":[],"eng_variants":[]},{"segment_id":794,"unit":"Tāū","unit_norm":"tāū","ipa":"tɑːːuː","phonetic":"t-ahh-ooh","vars":[],"eng_variants":[]},{"segment_id":793,"unit":"Taū","unit_norm":"taū","ipa":"tɑuː","phonetic":"t-ah-ooh","vars":[],"eng_variants":[]},{"segment_id":792,"unit":"Tāu","unit_norm":"tāu","ipa":"tɑːːʊː","phonetic":"t-ahh-ew","vars":[],"eng_variants":[]},{"segment_id":791,"unit":"Tāō","unit_norm":"tāō","ipa":"tɑːːɔːr","phonetic":"t-ahh-or","vars":[],"eng_variants":[]},{"segment_id":790,"unit":"Taō","unit_norm":"taō","ipa":"tɑɔːr","phonetic":"t-ah-or","vars":[],"eng_variants":[]},{"segment_id":789,"unit":"Tāo","unit_norm":"tāo","ipa":"tɑːːɔː","phonetic":"t-ahh-aw","vars":[],"eng_variants":[]},{"segment_id":788,"unit":"Tāī","unit_norm":"tāī","ipa":"tɑːːiːː","phonetic":"t-ahh-eee","vars":[],"eng_variants":[]},{"segment_id":787,"unit":"Taī","unit_norm":"taī","ipa":"tɑiːː","phonetic":"t-ah-eee","vars":[],"eng_variants":[]},{"segment_id":786,"unit":"Tāi","unit_norm":"tāi","ipa":"tɑːːiː","phonetic":"t-ahh-ee","vars":[],"eng_variants":[]},{"segment_id":785,"unit":"Tāē","unit_norm":"tāē","ipa":"tɑːːɛː","phonetic":"t-ahh-ehh","vars":[],"eng_variants":[]},{"segment_id":784,"unit":"Tāe","unit_norm":"tāe","ipa":"tɑːːɛh","phonetic":"t-ahh-eh","vars":[],"eng_variants":[]},{"segment_id":783,"unit":"Tāā","unit_norm":"tāā","ipa":"tɑːːɑːː","phonetic":"t-ahh-ahh","vars":[],"eng_variants":[]},{"segment_id":782,"unit":"Taā","unit_norm":"taā","ipa":"tɑɑːː","phonetic":"t-ah-ahh","vars":[],"eng_variants":[]},{"segment_id":781,"unit":"Tāa","unit_norm":"tāa","ipa":"tɑːːɑ","phonetic":"t-ahh-ah","vars":[],"eng_variants":[]},{"segment_id":780,"unit":"Tuu","unit_norm":"tuu","ipa":"tʊːʊː","phonetic":"t-ew-ew","vars":[],"eng_variants":[]},{"segment_id":779,"unit":"Tuo","unit_norm":"tuo","ipa":"tʊːɔː","phonetic":"t-ew-aw","vars":[],"eng_variants":[]},{"segment_id":778,"unit":"Tui","unit_norm":"tui","ipa":"tʊːiː","phonetic":"t-ew-ee","vars":[],"eng_variants":[]},{"segment_id":777,"unit":"Tue","unit_norm":"tue","ipa":"tʊːɛh","phonetic":"t-ew-eh","vars":[],"eng_variants":[]},{"segment_id":776,"unit":"Tua","unit_norm":"tua","ipa":"tʊːɑ","phonetic":"t-ew-ah","vars":[],"eng_variants":[]},{"segment_id":775,"unit":"Tou","unit_norm":"tou","ipa":"tɔːʊː","phonetic":"t-aw-ew","vars":[],"eng_variants":[]},{"segment_id":774,"unit":"Too","unit_norm":"too","ipa":"tɔːɔː","phonetic":"t-aw-aw","vars":[],"eng_variants":[]},{"segment_id":773,"unit":"Toi","unit_norm":"toi","ipa":"tɔːiː","phonetic":"t-aw-ee","vars":[],"eng_variants":[]},{"segment_id":772,"unit":"Toe","unit_norm":"toe","ipa":"tɔːɛh","phonetic":"t-aw-eh","vars":[],"eng_variants":[]},{"segment_id":771,"unit":"Toa","unit_norm":"toa","ipa":"tɔːɑ","phonetic":"t-aw-ah","vars":[],"eng_variants":[]},{"segment_id":770,"unit":"Tiu","unit_norm":"tiu","ipa":"tiːʊː","phonetic":"t-ee-ew","vars":[],"eng_variants":[]},{"segment_id":769,"unit":"Tio","unit_norm":"tio","ipa":"tiːɔː","phonetic":"t-ee-aw","vars":[],"eng_variants":[]},{"segment_id":768,"unit":"Tii","unit_norm":"tii","ipa":"tiːiː","phonetic":"t-ee-ee","vars":[],"eng_variants":[]},{"segment_id":767,"unit":"Tie","unit_norm":"tie","ipa":"tiːɛh","phonetic":"t-ee-eh","vars":[],"eng_variants":[]},{"segment_id":766,"unit":"Tia","unit_norm":"tia","ipa":"tiːɑ","phonetic":"t-ee-ah","vars":[],"eng_variants":[]},{"segment_id":765,"unit":"Teu","unit_norm":"teu","ipa":"tɛhʊː","phonetic":"t-eh-ew","vars":[],"eng_variants":[]},{"segment_id":764,"unit":"Teo","unit_norm":"teo","ipa":"tɛhɔː","phonetic":"t-eh-aw","vars":[],"eng_variants":[]},{"segment_id":763,"unit":"Tei","unit_norm":"tei","ipa":"tɛhiː","phonetic":"t-eh-ee","vars":[],"eng_variants":[]},{"segment_id":762,"unit":"Tee","unit_norm":"tee","ipa":"tɛhɛh","phonetic":"t-eh-eh","vars":[],"eng_variants":[]},{"segment_id":761,"unit":"Tea","unit_norm":"tea","ipa":"tɛhɑ","phonetic":"t-eh-ah","vars":[],"eng_variants":[]},{"segment_id":760,"unit":"Tau","unit_norm":"tau","ipa":"tɑʊː","phonetic":"t-ah-ew","vars":[],"eng_variants":[]},{"segment_id":759,"unit":"Tao","unit_norm":"tao","ipa":"tɑɔː","phonetic":"t-ah-aw","vars":[],"eng_variants":[]},{"segment_id":758,"unit":"Tai","unit_norm":"tai","ipa":"tɑiː","phonetic":"t-ah-ee","vars":[],"eng_variants":[]},{"segment_id":757,"unit":"Tae","unit_norm":"tae","ipa":"tɑɛh","phonetic":"t-ah-eh","vars":[],"eng_variants":[]},{"segment_id":756,"unit":"Taa","unit_norm":"taa","ipa":"tɑɑ","phonetic":"t-ah-ah","vars":[],"eng_variants":[]},{"segment_id":755,"unit":"Tū","unit_norm":"tū","ipa":"tuː","phonetic":"t-ooh","vars":[],"eng_variants":[]},{"segment_id":754,"unit":"Tō","unit_norm":"tō","ipa":"tɔːr","phonetic":"t-or","vars":[],"eng_variants":[]},{"segment_id":753,"unit":"Tī","unit_norm":"tī","ipa":"tiːː","phonetic":"t-eee","vars":[],"eng_variants":[]},{"segment_id":752,"unit":"Tē","unit_norm":"tē","ipa":"tɛː","phonetic":"t-ehh","vars":[{"label":"v1","bracket":"(te)n","just_part":"te"},{"label":"v2","bracket":"(te)ch","just_part":"te"}],"eng_variants":["(te)n","(te)ch"]},{"segment_id":751,"unit":"Tā","unit_norm":"tā","ipa":"tɑːː","phonetic":"t-ahh","vars":[{"label":"v1","bracket":"(ta)r","just_part":"ta"},{"label":"v2","bracket":"(ta)rp","just_part":"ta"},{"label":"v3","bracket":"(ta)rt","just_part":"ta"}],"eng_variants":["(ta)r","(ta)rp","(ta)rt"]},{"segment_id":750,"unit":"Tu","unit_norm":"tu","ipa":"tʊː","phonetic":"t-ew","vars":[],"eng_variants":[]},{"segment_id":749,"unit":"To","unit_norm":"to","ipa":"tɔː","phonetic":"t-aw","vars":[],"eng_variants":[]},{"segment_id":748,"unit":"Ti","unit_norm":"ti","ipa":"tiː","phonetic":"t-ee","vars":[{"label":"v1","bracket":"(te)am","just_part":"te"},{"label":"v2","bracket":"(te)a","just_part":"te"},{"label":"v3","bracket":"(t)","just_part":"t"}],"eng_variants":["(te)am","(te)a","(t)"]},{"segment_id":747,"unit":"Te","unit_norm":"te","ipa":"tɛh","phonetic":"t-eh","vars":[{"label":"v1","bracket":"(te)n","just_part":"te"},{"label":"v2","bracket":"(te)ch","just_part":"te"}],"eng_variants":["(te)n","(te)ch"]},{"segment_id":746,"unit":"Ta","unit_norm":"ta","ipa":"tɑ","phonetic":"t-ah","vars":[{"label":"v1","bracket":"(ta)r","just_part":"ta"},{"label":"v2","bracket":"(ta)rp","just_part":"ta"},{"label":"v3","bracket":"(ta)rt","just_part":"ta"}],"eng_variants":["(ta)r","(ta)rp","(ta)rt"]},{"segment_id":745,"unit":"Rūū","unit_norm":"rūū","ipa":".ɾ͡du̞ːu̞ː","phonetic":"r-ooh-ooh","vars":[],"eng_variants":[]},{"segment_id":744,"unit":"Ruū","unit_norm":"ruū","ipa":".ɾ͡dʊ̞ːu̞ː","phonetic":"r-ew-ooh","vars":[],"eng_variants":[]},{"segment_id":743,"unit":"Rūu","unit_norm":"rūu","ipa":".ɾ͡du̞ːʊ̞ː","phonetic":"r-ooh-ew","vars":[],"eng_variants":[]},{"segment_id":742,"unit":"Rūō","unit_norm":"rūō","ipa":".ɾ͡du̞ːɔ̞ːr","phonetic":"r-ooh-or","vars":[],"eng_variants":[]},{"segment_id":741,"unit":"Raō","unit_norm":"raō","ipa":".ɾ͡dɑ̞ɔ̞ːr","phonetic":"r-ah-or","vars":[],"eng_variants":[]},{"segment_id":740,"unit":"Rūo","unit_norm":"rūo","ipa":".ɾ͡du̞ːɔ̞ː","phonetic":"r-ooh-aw","vars":[],"eng_variants":[]},{"segment_id":739,"unit":"Rūī","unit_norm":"rūī","ipa":".ɾ͡du̞ːi̞ːː","phonetic":"r-ooh-eee","vars":[],"eng_variants":[]},{"segment_id":738,"unit":"Ruī","unit_norm":"ruī","ipa":".ɾ͡dʊ̞ːi̞ːː","phonetic":"r-ew-eee","vars":[],"eng_variants":[]},{"segment_id":737,"unit":"Rūi","unit_norm":"rūi","ipa":".ɾ͡du̞ːi̞ː","phonetic":"r-ooh-ee","vars":[],"eng_variants":[]},{"segment_id":736,"unit":"Rūē","unit_norm":"rūē","ipa":".ɾ͡du̞ːɛ̞ː","phonetic":"r-ooh-ehh","vars":[],"eng_variants":[]},{"segment_id":735,"unit":"Rūe","unit_norm":"rūe","ipa":".ɾ͡du̞ːɛ̞h","phonetic":"r-ooh-eh","vars":[],"eng_variants":[]},{"segment_id":734,"unit":"Rūā","unit_norm":"rūā","ipa":".ɾ͡du̞ːɑːː","phonetic":"r-ooh-ahh","vars":[],"eng_variants":[]},{"segment_id":733,"unit":"Ruā","unit_norm":"ruā","ipa":".ɾ͡dʊ̞ːɑːː","phonetic":"r-ew-ahh","vars":[],"eng_variants":[]},{"segment_id":732,"unit":"Rūa","unit_norm":"rūa","ipa":".ɾ͡du̞ːɑ̞","phonetic":"r-ooh-ah","vars":[],"eng_variants":[]},{"segment_id":731,"unit":"Rōū","unit_norm":"rōū","ipa":".ɾ͡dɔ̞ːru̞ː","phonetic":"r-or-ooh","vars":[],"eng_variants":[]},{"segment_id":730,"unit":"Roū","unit_norm":"roū","ipa":".ɾ͡dɔ̞ːu̞ː","phonetic":"r-aw-ooh","vars":[],"eng_variants":[]},{"segment_id":729,"unit":"Rōu","unit_norm":"rōu","ipa":".ɾ͡dɔ̞ːrʊ̞ː","phonetic":"r-or-ew","vars":[],"eng_variants":[]},{"segment_id":728,"unit":"Rōō","unit_norm":"rōō","ipa":".ɾ͡dɔ̞ːrɔ̞ːr","phonetic":"r-or-or","vars":[],"eng_variants":[]},{"segment_id":727,"unit":"Roō","unit_norm":"roō","ipa":".ɾ͡dɔ̞ːɔ̞ːr","phonetic":"r-aw-or","vars":[],"eng_variants":[]},{"segment_id":726,"unit":"Rōo","unit_norm":"rōo","ipa":".ɾ͡dɔ̞ːrɔ̞ː","phonetic":"r-or-aw","vars":[],"eng_variants":[]},{"segment_id":725,"unit":"Rōī","unit_norm":"rōī","ipa":".ɾ͡dɔ̞ːri̞ːː","phonetic":"r-or-eee","vars":[],"eng_variants":[]},{"segment_id":724,"unit":"Roī","unit_norm":"roī","ipa":".ɾ͡dɔ̞ːi̞ːː","phonetic":"r-aw-eee","vars":[],"eng_variants":[]},{"segment_id":723,"unit":"Rōi","unit_norm":"rōi","ipa":".ɾ͡dɔ̞ːri̞ː","phonetic":"r-or-ee","vars":[],"eng_variants":[]},{"segment_id":722,"unit":"Rōē","unit_norm":"rōē","ipa":".ɾ͡dɔ̞ːrɛ̞ː","phonetic":"r-or-ehh","vars":[],"eng_variants":[]},{"segment_id":721,"unit":"Rōe","unit_norm":"rōe","ipa":".ɾ͡dɔ̞ːrɛ̞h","phonetic":"r-or-eh","vars":[],"eng_variants":[]},{"segment_id":720,"unit":"Rōā","unit_norm":"rōā","ipa":".ɾ͡dɔ̞ːrɑːː","phonetic":"r-or-ahh","vars":[],"eng_variants":[]},{"segment_id":719,"unit":"Roā","unit_norm":"roā","ipa":".ɾ͡dɔ̞ːɑːː","phonetic":"r-aw-ahh","vars":[],"eng_variants":[]},{"segment_id":718,"unit":"Rōa","unit_norm":"rōa","ipa":".ɾ͡dɔ̞ːrɑ̞","phonetic":"r-or-ah","vars":[],"eng_variants":[]},{"segment_id":717,"unit":"Rīū","unit_norm":"rīū","ipa":".ɾ͡di̞ːːu̞ː","phonetic":"r-eee-ooh","vars":[],"eng_variants":[]},{"segment_id":716,"unit":"Riū","unit_norm":"riū","ipa":".ɾ͡di̞ːu̞ː","phonetic":"r-ee-ooh","vars":[],"eng_variants":[]},{"segment_id":715,"unit":"Rīu","unit_norm":"rīu","ipa":".ɾ͡di̞ːːʊ̞ː","phonetic":"r-eee-ew","vars":[],"eng_variants":[]},{"segment_id":714,"unit":"Rīō","unit_norm":"rīō","ipa":".ɾ͡di̞ːːɔ̞ːr","phonetic":"r-eee-or","vars":[],"eng_variants":[]},{"segment_id":713,"unit":"Riō","unit_norm":"riō","ipa":".ɾ͡di̞ːɔ̞ːr","phonetic":"r-ee-or","vars":[],"eng_variants":[]},{"segment_id":712,"unit":"Rīo","unit_norm":"rīo","ipa":".ɾ͡di̞ːːɔ̞ː","phonetic":"r-eee-aw","vars":[],"eng_variants":[]},{"segment_id":711,"unit":"Rīī","unit_norm":"rīī","ipa":".ɾ͡di̞ːːi̞ːː","phonetic":"r-eee-eee","vars":[],"eng_variants":[]},{"segment_id":710,"unit":"Riī","unit_norm":"riī","ipa":".ɾ͡di̞ːi̞ːː","phonetic":"r-ee-eee","vars":[],"eng_variants":[]},{"segment_id":709,"unit":"Rīi","unit_norm":"rīi","ipa":".ɾ͡di̞ːːi̞ː","phonetic":"r-eee-ee","vars":[],"eng_variants":[]},{"segment_id":708,"unit":"Rīē","unit_norm":"rīē","ipa":".ɾ͡di̞ːːɛ̞ː","phonetic":"r-eee-ehh","vars":[],"eng_variants":[]},{"segment_id":707,"unit":"Rīe","unit_norm":"rīe","ipa":".ɾ͡di̞ːːɛ̞h","phonetic":"r-eee-eh","vars":[],"eng_variants":[]},{"segment_id":706,"unit":"Rīā","unit_norm":"rīā","ipa":".ɾ͡di̞ːːɑːː","phonetic":"r-eee-ahh","vars":[],"eng_variants":[]},{"segment_id":705,"unit":"Riā","unit_norm":"riā","ipa":".ɾ͡di̞ːɑːː","phonetic":"r-ee-ahh","vars":[],"eng_variants":[]},{"segment_id":704,"unit":"Rīa","unit_norm":"rīa","ipa":".ɾ͡di̞ːːɑ̞","phonetic":"r-eee-ah","vars":[],"eng_variants":[]},{"segment_id":703,"unit":"Rēū","unit_norm":"rēū","ipa":".ɾ͡dɛ̞ːu̞ː","phonetic":"r-ehh-ooh","vars":[],"eng_variants":[]},{"segment_id":702,"unit":"Reū","unit_norm":"reū","ipa":".ɾ͡dɛ̞hu̞ː","phonetic":"r-eh-ooh","vars":[],"eng_variants":[]},{"segment_id":701,"unit":"Rēu","unit_norm":"rēu","ipa":".ɾ͡dɛ̞ːʊ̞ː","phonetic":"r-ehh-ew","vars":[],"eng_variants":[]},{"segment_id":700,"unit":"Rēō","unit_norm":"rēō","ipa":".ɾ͡dɛ̞ːɔ̞ːr","phonetic":"r-ehh-or","vars":[],"eng_variants":[]},{"segment_id":699,"unit":"Reō","unit_norm":"reō","ipa":".ɾ͡dɛ̞hɔ̞ːr","phonetic":"r-eh-or","vars":[],"eng_variants":[]},{"segment_id":698,"unit":"Rēo","unit_norm":"rēo","ipa":".ɾ͡dɛ̞ːɔ̞ː","phonetic":"r-ehh-aw","vars":[],"eng_variants":[]},{"segment_id":697,"unit":"Rēī","unit_norm":"rēī","ipa":".ɾ͡dɛ̞ːi̞ːː","phonetic":"r-ehh-eee","vars":[],"eng_variants":[]},{"segment_id":696,"unit":"Reī","unit_norm":"reī","ipa":".ɾ͡dɛ̞hi̞ːː","phonetic":"r-eh-eee","vars":[],"eng_variants":[]},{"segment_id":695,"unit":"Rēi","unit_norm":"rēi","ipa":".ɾ͡dɛ̞ːi̞ː","phonetic":"r-ehh-ee","vars":[],"eng_variants":[]},{"segment_id":694,"unit":"Rēē","unit_norm":"rēē","ipa":".ɾ͡dɛ̞ːɛ̞ː","phonetic":"r-ehh-ehh","vars":[],"eng_variants":[]},{"segment_id":693,"unit":"Rēe","unit_norm":"rēe","ipa":".ɾ͡dɛ̞ːɛ̞h","phonetic":"r-ehh-eh","vars":[],"eng_variants":[]},{"segment_id":692,"unit":"Rēā","unit_norm":"rēā","ipa":".ɾ͡dɛ̞ːɑːː","phonetic":"r-ehh-ahh","vars":[],"eng_variants":[]},{"segment_id":691,"unit":"Reā","unit_norm":"reā","ipa":".ɾ͡dɛ̞hɑːː","phonetic":"r-eh-ahh","vars":[],"eng_variants":[]},{"segment_id":690,"unit":"Rēa","unit_norm":"rēa","ipa":".ɾ͡dɛ̞ːɑ̞","phonetic":"r-ehh-ah","vars":[],"eng_variants":[]},{"segment_id":689,"unit":"Rāū","unit_norm":"rāū","ipa":".ɾ͡dɑːːu̞ː","phonetic":"r-ahh-ooh","vars":[],"eng_variants":[]},{"segment_id":688,"unit":"Raū","unit_norm":"raū","ipa":".ɾ͡dɑ̞u̞ː","phonetic":"r-ah-ooh","vars":[],"eng_variants":[]},{"segment_id":687,"unit":"Rāu","unit_norm":"rāu","ipa":".ɾ͡dɑːːʊ̞ː","phonetic":"r-ahh-ew","vars":[],"eng_variants":[]},{"segment_id":686,"unit":"Rāō","unit_norm":"rāō","ipa":".ɾ͡dɑːːɔ̞ːr","phonetic":"r-ahh-or","vars":[],"eng_variants":[]},{"segment_id":685,"unit":"Raō","unit_norm":"raō","ipa":".ɾ͡dɑ̞ɔ̞ːr","phonetic":"r-ah-or","vars":[],"eng_variants":[]},{"segment_id":684,"unit":"Rāo","unit_norm":"rāo","ipa":".ɾ͡dɑːːɔ̞ː","phonetic":"r-ahh-aw","vars":[],"eng_variants":[]},{"segment_id":683,"unit":"Rāī","unit_norm":"rāī","ipa":".ɾ͡dɑːːi̞ːː","phonetic":"r-ahh-eee","vars":[],"eng_variants":[]},{"segment_id":682,"unit":"Raī","unit_norm":"raī","ipa":".ɾ͡dɑ̞i̞ːː","phonetic":"r-ah-eee","vars":[],"eng_variants":[]},{"segment_id":681,"unit":"Rāi","unit_norm":"rāi","ipa":".ɾ͡dɑːːi̞ː","phonetic":"r-ahh-ee","vars":[],"eng_variants":[]},{"segment_id":680,"unit":"Rāē","unit_norm":"rāē","ipa":".ɾ͡dɑːːɛ̞ː","phonetic":"r-ahh-ehh","vars":[],"eng_variants":[]},{"segment_id":679,"unit":"Rāe","unit_norm":"rāe","ipa":".ɾ͡dɑːːɛ̞h","phonetic":"r-ahh-eh","vars":[],"eng_variants":[]},{"segment_id":678,"unit":"Rāā","unit_norm":"rāā","ipa":".ɾ͡dɑːːɑːː","phonetic":"r-ahh-ahh","vars":[],"eng_variants":[]},{"segment_id":677,"unit":"Raā","unit_norm":"raā","ipa":".ɾ͡dɑ̞ɑːː","phonetic":"r-ah-ahh","vars":[],"eng_variants":[]},{"segment_id":676,"unit":"Rāa","unit_norm":"rāa","ipa":".ɾ͡dɑːːɑ̞","phonetic":"r-ahh-ah","vars":[],"eng_variants":[]},{"segment_id":675,"unit":"Ruu","unit_norm":"ruu","ipa":".ɾ͡dʊ̞ːʊ̞ː","phonetic":"r-ew-ew","vars":[],"eng_variants":[]},{"segment_id":674,"unit":"Ruo","unit_norm":"ruo","ipa":".ɾ͡dʊ̞ːɔ̞ː","phonetic":"r-ew-aw","vars":[],"eng_variants":[]},{"segment_id":673,"unit":"Rui","unit_norm":"rui","ipa":".ɾ͡dʊ̞ːi̞ː","phonetic":"r-ew-ee","vars":[],"eng_variants":[]},{"segment_id":672,"unit":"Rue","unit_norm":"rue","ipa":".ɾ͡dʊ̞ːɛ̞h","phonetic":"r-ew-eh","vars":[],"eng_variants":[]},{"segment_id":671,"unit":"Rua","unit_norm":"rua","ipa":".ɾ͡dʊ̞ːɑ̞","phonetic":"r-ew-ah","vars":[],"eng_variants":[]},{"segment_id":670,"unit":"Rou","unit_norm":"rou","ipa":".ɾ͡dɔ̞ːʊ̞ː","phonetic":"r-aw-ew","vars":[],"eng_variants":[]},{"segment_id":669,"unit":"Roo","unit_norm":"roo","ipa":".ɾ͡dɔ̞ːɔ̞ː","phonetic":"r-aw-aw","vars":[],"eng_variants":[]},{"segment_id":668,"unit":"Roi","unit_norm":"roi","ipa":".ɾ͡dɔ̞ːi̞ː","phonetic":"r-aw-ee","vars":[],"eng_variants":[]},{"segment_id":667,"unit":"Roe","unit_norm":"roe","ipa":".ɾ͡dɔ̞ːɛ̞h","phonetic":"r-aw-eh","vars":[],"eng_variants":[]},{"segment_id":666,"unit":"Roa","unit_norm":"roa","ipa":".ɾ͡dɔ̞ːɑ̞","phonetic":"r-aw-ah","vars":[],"eng_variants":[]},{"segment_id":665,"unit":"Riu","unit_norm":"riu","ipa":".ɾ͡di̞ːʊ̞ː","phonetic":"r-ee-ew","vars":[],"eng_variants":[]},{"segment_id":664,"unit":"Rio","unit_norm":"rio","ipa":".ɾ͡di̞ːɔ̞ː","phonetic":"r-ee-aw","vars":[],"eng_variants":[]},{"segment_id":663,"unit":"Rii","unit_norm":"rii","ipa":".ɾ͡di̞ːi̞ː","phonetic":"r-ee-ee","vars":[],"eng_variants":[]},{"segment_id":662,"unit":"Rie","unit_norm":"rie","ipa":".ɾ͡di̞ːɛ̞h","phonetic":"r-ee-eh","vars":[],"eng_variants":[]},{"segment_id":661,"unit":"Ria","unit_norm":"ria","ipa":".ɾ͡di̞ːɑ̞","phonetic":"r-ee-ah","vars":[],"eng_variants":[]},{"segment_id":660,"unit":"Reu","unit_norm":"reu","ipa":".ɾ͡dɛ̞hʊ̞ː","phonetic":"r-eh-ew","vars":[],"eng_variants":[]},{"segment_id":659,"unit":"Reo","unit_norm":"reo","ipa":".ɾ͡dɛ̞hɔ̞ː","phonetic":"r-eh-aw","vars":[],"eng_variants":[]},{"segment_id":658,"unit":"Rei","unit_norm":"rei","ipa":".ɾ͡dɛ̞hi̞ː","phonetic":"r-eh-ee","vars":[],"eng_variants":[]},{"segment_id":657,"unit":"Ree","unit_norm":"ree","ipa":".ɾ͡dɛ̞hɛ̞h","phonetic":"r-eh-eh","vars":[],"eng_variants":[]},{"segment_id":656,"unit":"Rea","unit_norm":"rea","ipa":".ɾ͡dɛ̞hɑ̞","phonetic":"r-eh-ah","vars":[],"eng_variants":[]},{"segment_id":655,"unit":"Rau","unit_norm":"rau","ipa":".ɾ͡dɑ̞ʊ̞ː","phonetic":"r-ah-ew","vars":[],"eng_variants":[]},{"segment_id":654,"unit":"Rao","unit_norm":"rao","ipa":".ɾ͡dɑ̞ɔ̞ː","phonetic":"r-ah-aw","vars":[],"eng_variants":[]},{"segment_id":653,"unit":"Rai","unit_norm":"rai","ipa":".ɾ͡dɑ̞i̞ː","phonetic":"r-ah-ee","vars":[],"eng_variants":[]},{"segment_id":652,"unit":"Rae","unit_norm":"rae","ipa":".ɾ͡dɑ̞ɛ̞h","phonetic":"r-ah-eh","vars":[],"eng_variants":[]},{"segment_id":651,"unit":"Raa","unit_norm":"raa","ipa":".ɾ͡dɑ̞ɑ̞","phonetic":"r-ah-ah","vars":[],"eng_variants":[]},{"segment_id":650,"unit":"Rū","unit_norm":"rū","ipa":".ɾ͡du̞ː","phonetic":"r-ooh","vars":[],"eng_variants":[]},{"segment_id":649,"unit":"Rō","unit_norm":"rō","ipa":".ɾ͡dɔ̞ːr","phonetic":"r-or","vars":[],"eng_variants":[]},{"segment_id":648,"unit":"Rī","unit_norm":"rī","ipa":".ɾ͡di̞ːː","phonetic":"r-eee","vars":[{"label":"v1","bracket":"(re)ad","just_part":"re"},{"label":"v2","bracket":"(ree)f","just_part":"ree"},{"label":"v3","bracket":"(ree)l","just_part":"ree"}],"eng_variants":["(re)ad","(ree)f","(ree)l"]},{"segment_id":647,"unit":"Rē","unit_norm":"rē","ipa":".ɾ͡dɛ̞ː","phonetic":"r-ehh","vars":[{"label":"v1","bracket":"(re)d","just_part":"re"},{"label":"v2","bracket":"(re)n","just_part":"re"},{"label":"v3","bracket":"(rea)dy","just_part":"rea"},{"label":"v4","bracket":"(re)c","just_part":"re"}],"eng_variants":["(re)d","(re)n","(rea)dy","(re)c"]},{"segment_id":646,"unit":"Rā","unit_norm":"rā","ipa":".ɾ͡dɑːː","phonetic":"r-ahh","vars":[{"label":"v1","bracket":"(ru)n","just_part":"ru"},{"label":"v2","bracket":"(rou)gh","just_part":"rou"},{"label":"v3","bracket":"(ru)ff","just_part":"ru"},{"label":"v4","bracket":"(ru)t","just_part":"ru"},{"label":"v5","bracket":"(ru)g","just_part":"ru"}],"eng_variants":["(ru)n","(rou)gh","(ru)ff","(ru)t","(ru)g"]},{"segment_id":645,"unit":"Ru","unit_norm":"ru","ipa":".ɾ͡dʊ̞ː","phonetic":"r-ew","vars":[],"eng_variants":[]},{"segment_id":644,"unit":"Ro","unit_norm":"ro","ipa":".ɾ͡dɔ̞ː","phonetic":"r-aw","vars":[],"eng_variants":[]},{"segment_id":643,"unit":"Ri","unit_norm":"ri","ipa":".ɾ͡di̞ː","phonetic":"r-ee","vars":[{"label":"v1","bracket":"(re)ad","just_part":"re"},{"label":"v2","bracket":"(ree)f","just_part":"ree"},{"label":"v3","bracket":"(ree)l","just_part":"ree"}],"eng_variants":["(re)ad","(ree)f","(ree)l"]},{"segment_id":642,"unit":"Re","unit_norm":"re","ipa":".ɾ͡dɛ̞h","phonetic":"r-eh","vars":[{"label":"v1","bracket":"(re)d","just_part":"re"},{"label":"v2","bracket":"(re)n","just_part":"re"},{"label":"v3","bracket":"(rea)dy","just_part":"rea"},{"label":"v4","bracket":"(re)c","just_part":"re"}],"eng_variants":["(re)d","(re)n","(rea)dy","(re)c"]},{"segment_id":641,"unit":"Ra","unit_norm":"ra","ipa":".ɾ͡dɑ̞","phonetic":"r-ah","vars":[{"label":"v1","bracket":"(ru)n","just_part":"ru"},{"label":"v2","bracket":"(rou)gh","just_part":"rou"},{"label":"v3","bracket":"(ru)ff","just_part":"ru"},{"label":"v4","bracket":"(ru)t","just_part":"ru"},{"label":"v5","bracket":"(ru)g","just_part":"ru"}],"eng_variants":["(ru)n","(rou)gh","(ru)ff","(ru)t","(ru)g"]},{"segment_id":640,"unit":"Pūū","unit_norm":"pūū","ipa":"puːuː","phonetic":"p-ooh-ooh","vars":[],"eng_variants":[]},{"segment_id":639,"unit":"Puū","unit_norm":"puū","ipa":"pʊːuː","phonetic":"p-ew-ooh","vars":[],"eng_variants":[]},{"segment_id":638,"unit":"Pūu","unit_norm":"pūu","ipa":"puːʊː","phonetic":"p-ooh-ew","vars":[],"eng_variants":[]},{"segment_id":637,"unit":"Pūō","unit_norm":"pūō","ipa":"puːɔːr","phonetic":"p-ooh-or","vars":[],"eng_variants":[]},{"segment_id":636,"unit":"Paō","unit_norm":"paō","ipa":"pɑɔːr","phonetic":"p-ah-or","vars":[],"eng_variants":[]},{"segment_id":635,"unit":"Pūo","unit_norm":"pūo","ipa":"puːɔː","phonetic":"p-ooh-aw","vars":[],"eng_variants":[]},{"segment_id":634,"unit":"Pūī","unit_norm":"pūī","ipa":"puːiːː","phonetic":"p-ooh-eee","vars":[],"eng_variants":[]},{"segment_id":633,"unit":"Puī","unit_norm":"puī","ipa":"pʊːiːː","phonetic":"p-ew-eee","vars":[],"eng_variants":[]},{"segment_id":632,"unit":"Pūi","unit_norm":"pūi","ipa":"puːiː","phonetic":"p-ooh-ee","vars":[],"eng_variants":[]},{"segment_id":631,"unit":"Pūē","unit_norm":"pūē","ipa":"puːɛː","phonetic":"p-ooh-ehh","vars":[],"eng_variants":[]},{"segment_id":630,"unit":"Pūe","unit_norm":"pūe","ipa":"puːɛh","phonetic":"p-ooh-eh","vars":[],"eng_variants":[]},{"segment_id":629,"unit":"Pūā","unit_norm":"pūā","ipa":"puːɑːː","phonetic":"p-ooh-ahh","vars":[],"eng_variants":[]},{"segment_id":628,"unit":"Puā","unit_norm":"puā","ipa":"pʊːɑːː","phonetic":"p-ew-ahh","vars":[],"eng_variants":[]},{"segment_id":627,"unit":"Pūa","unit_norm":"pūa","ipa":"puːɑ","phonetic":"p-ooh-ah","vars":[],"eng_variants":[]},{"segment_id":626,"unit":"Pōū","unit_norm":"pōū","ipa":"pɔːruː","phonetic":"p-or-ooh","vars":[],"eng_variants":[]},{"segment_id":625,"unit":"Poū","unit_norm":"poū","ipa":"pɔːuː","phonetic":"p-aw-ooh","vars":[],"eng_variants":[]},{"segment_id":624,"unit":"Pōu","unit_norm":"pōu","ipa":"pɔːrʊː","phonetic":"p-or-ew","vars":[],"eng_variants":[]},{"segment_id":623,"unit":"Pōō","unit_norm":"pōō","ipa":"pɔːrɔːr","phonetic":"p-or-or","vars":[],"eng_variants":[]},{"segment_id":622,"unit":"Poō","unit_norm":"poō","ipa":"pɔːɔːr","phonetic":"p-aw-or","vars":[],"eng_variants":[]},{"segment_id":621,"unit":"Pōo","unit_norm":"pōo","ipa":"pɔːrɔː","phonetic":"p-or-aw","vars":[],"eng_variants":[]},{"segment_id":620,"unit":"Pōī","unit_norm":"pōī","ipa":"pɔːriːː","phonetic":"p-or-eee","vars":[],"eng_variants":[]},{"segment_id":619,"unit":"Poī","unit_norm":"poī","ipa":"pɔːiːː","phonetic":"p-aw-eee","vars":[],"eng_variants":[]},{"segment_id":618,"unit":"Pōi","unit_norm":"pōi","ipa":"pɔːriː","phonetic":"p-or-ee","vars":[],"eng_variants":[]},{"segment_id":617,"unit":"Pōē","unit_norm":"pōē","ipa":"pɔːrɛː","phonetic":"p-or-ehh","vars":[],"eng_variants":[]},{"segment_id":616,"unit":"Pōe","unit_norm":"pōe","ipa":"pɔːrɛh","phonetic":"p-or-eh","vars":[],"eng_variants":[]},{"segment_id":615,"unit":"Pōā","unit_norm":"pōā","ipa":"pɔːrɑːː","phonetic":"p-or-ahh","vars":[],"eng_variants":[]},{"segment_id":614,"unit":"Poā","unit_norm":"poā","ipa":"pɔːɑːː","phonetic":"p-aw-ahh","vars":[],"eng_variants":[]},{"segment_id":613,"unit":"Pōa","unit_norm":"pōa","ipa":"pɔːrɑ","phonetic":"p-or-ah","vars":[],"eng_variants":[]},{"segment_id":612,"unit":"Pīū","unit_norm":"pīū","ipa":"piːːuː","phonetic":"p-eee-ooh","vars":[],"eng_variants":[]},{"segment_id":611,"unit":"Piū","unit_norm":"piū","ipa":"piːuː","phonetic":"p-ee-ooh","vars":[],"eng_variants":[]},{"segment_id":610,"unit":"Pīu","unit_norm":"pīu","ipa":"piːːʊː","phonetic":"p-eee-ew","vars":[],"eng_variants":[]},{"segment_id":609,"unit":"Pīō","unit_norm":"pīō","ipa":"piːːɔːr","phonetic":"p-eee-or","vars":[],"eng_variants":[]},{"segment_id":608,"unit":"Piō","unit_norm":"piō","ipa":"piːɔːr","phonetic":"p-ee-or","vars":[],"eng_variants":[]},{"segment_id":607,"unit":"Pīo","unit_norm":"pīo","ipa":"piːːɔː","phonetic":"p-eee-aw","vars":[],"eng_variants":[]},{"segment_id":606,"unit":"Pīī","unit_norm":"pīī","ipa":"piːːiːː","phonetic":"p-eee-eee","vars":[],"eng_variants":[]},{"segment_id":605,"unit":"Piī","unit_norm":"piī","ipa":"piːiːː","phonetic":"p-ee-eee","vars":[],"eng_variants":[]},{"segment_id":604,"unit":"Pīi","unit_norm":"pīi","ipa":"piːːiː","phonetic":"p-eee-ee","vars":[],"eng_variants":[]},{"segment_id":603,"unit":"Pīē","unit_norm":"pīē","ipa":"piːːɛː","phonetic":"p-eee-ehh","vars":[],"eng_variants":[]},{"segment_id":602,"unit":"Pīe","unit_norm":"pīe","ipa":"piːːɛh","phonetic":"p-eee-eh","vars":[],"eng_variants":[]},{"segment_id":601,"unit":"Pīā","unit_norm":"pīā","ipa":"piːːɑːː","phonetic":"p-eee-ahh","vars":[],"eng_variants":[]},{"segment_id":600,"unit":"Piā","unit_norm":"piā","ipa":"piːɑːː","phonetic":"p-ee-ahh","vars":[],"eng_variants":[]},{"segment_id":599,"unit":"Pīa","unit_norm":"pīa","ipa":"piːːɑ","phonetic":"p-eee-ah","vars":[],"eng_variants":[]},{"segment_id":598,"unit":"Pēū","unit_norm":"pēū","ipa":"pɛːuː","phonetic":"p-ehh-ooh","vars":[],"eng_variants":[]},{"segment_id":597,"unit":"Peū","unit_norm":"peū","ipa":"pɛhuː","phonetic":"p-eh-ooh","vars":[],"eng_variants":[]},{"segment_id":596,"unit":"Pēu","unit_norm":"pēu","ipa":"pɛːʊː","phonetic":"p-ehh-ew","vars":[],"eng_variants":[]},{"segment_id":595,"unit":"Pēō","unit_norm":"pēō","ipa":"pɛːɔːr","phonetic":"p-ehh-or","vars":[],"eng_variants":[]},{"segment_id":594,"unit":"Peō","unit_norm":"peō","ipa":"pɛhɔːr","phonetic":"p-eh-or","vars":[],"eng_variants":[]},{"segment_id":593,"unit":"Pēo","unit_norm":"pēo","ipa":"pɛːɔː","phonetic":"p-ehh-aw","vars":[],"eng_variants":[]},{"segment_id":592,"unit":"Pēī","unit_norm":"pēī","ipa":"pɛːiːː","phonetic":"p-ehh-eee","vars":[],"eng_variants":[]},{"segment_id":591,"unit":"Peī","unit_norm":"peī","ipa":"pɛhiːː","phonetic":"p-eh-eee","vars":[],"eng_variants":[]},{"segment_id":590,"unit":"Pēi","unit_norm":"pēi","ipa":"pɛːiː","phonetic":"p-ehh-ee","vars":[],"eng_variants":[]},{"segment_id":589,"unit":"Pēē","unit_norm":"pēē","ipa":"pɛːɛː","phonetic":"p-ehh-ehh","vars":[],"eng_variants":[]},{"segment_id":588,"unit":"Pēe","unit_norm":"pēe","ipa":"pɛːɛh","phonetic":"p-ehh-eh","vars":[],"eng_variants":[]},{"segment_id":587,"unit":"Pēā","unit_norm":"pēā","ipa":"pɛːɑːː","phonetic":"p-ehh-ahh","vars":[],"eng_variants":[]},{"segment_id":586,"unit":"Peā","unit_norm":"peā","ipa":"pɛhɑːː","phonetic":"p-eh-ahh","vars":[],"eng_variants":[]},{"segment_id":585,"unit":"Pēa","unit_norm":"pēa","ipa":"pɛːɑ","phonetic":"p-ehh-ah","vars":[],"eng_variants":[]},{"segment_id":584,"unit":"Pāū","unit_norm":"pāū","ipa":"pɑːːuː","phonetic":"p-ahh-ooh","vars":[],"eng_variants":[]},{"segment_id":583,"unit":"Paū","unit_norm":"paū","ipa":"pɑuː","phonetic":"p-ah-ooh","vars":[],"eng_variants":[]},{"segment_id":582,"unit":"Pāu","unit_norm":"pāu","ipa":"pɑːːʊː","phonetic":"p-ahh-ew","vars":[],"eng_variants":[]},{"segment_id":581,"unit":"Pāō","unit_norm":"pāō","ipa":"pɑːːɔːr","phonetic":"p-ahh-or","vars":[],"eng_variants":[]},{"segment_id":580,"unit":"Paō","unit_norm":"paō","ipa":"pɑɔːr","phonetic":"p-ah-or","vars":[],"eng_variants":[]},{"segment_id":579,"unit":"Pāo","unit_norm":"pāo","ipa":"pɑːːɔː","phonetic":"p-ahh-aw","vars":[],"eng_variants":[]},{"segment_id":578,"unit":"Pāī","unit_norm":"pāī","ipa":"pɑːːiːː","phonetic":"p-ahh-eee","vars":[],"eng_variants":[]},{"segment_id":577,"unit":"Paī","unit_norm":"paī","ipa":"pɑiːː","phonetic":"p-ah-eee","vars":[],"eng_variants":[]},{"segment_id":576,"unit":"Pāi","unit_norm":"pāi","ipa":"pɑːːiː","phonetic":"p-ahh-ee","vars":[],"eng_variants":[]},{"segment_id":575,"unit":"Pāē","unit_norm":"pāē","ipa":"pɑːːɛː","phonetic":"p-ahh-ehh","vars":[],"eng_variants":[]},{"segment_id":574,"unit":"Pāe","unit_norm":"pāe","ipa":"pɑːːɛh","phonetic":"p-ahh-eh","vars":[],"eng_variants":[]},{"segment_id":573,"unit":"Pāā","unit_norm":"pāā","ipa":"pɑːːɑːː","phonetic":"p-ahh-ahh","vars":[],"eng_variants":[]},{"segment_id":572,"unit":"Paā","unit_norm":"paā","ipa":"pɑɑːː","phonetic":"p-ah-ahh","vars":[],"eng_variants":[]},{"segment_id":571,"unit":"Pāa","unit_norm":"pāa","ipa":"pɑːːɑ","phonetic":"p-ahh-ah","vars":[],"eng_variants":[]},{"segment_id":570,"unit":"Puu","unit_norm":"puu","ipa":"pʊːʊː","phonetic":"p-ew-ew","vars":[],"eng_variants":[]},{"segment_id":569,"unit":"Puo","unit_norm":"puo","ipa":"pʊːɔː","phonetic":"p-ew-aw","vars":[],"eng_variants":[]},{"segment_id":568,"unit":"Pui","unit_norm":"pui","ipa":"pʊːiː","phonetic":"p-ew-ee","vars":[],"eng_variants":[]},{"segment_id":567,"unit":"Pue","unit_norm":"pue","ipa":"pʊːɛh","phonetic":"p-ew-eh","vars":[],"eng_variants":[]},{"segment_id":566,"unit":"Pua","unit_norm":"pua","ipa":"pʊːɑ","phonetic":"p-ew-ah","vars":[],"eng_variants":[]},{"segment_id":565,"unit":"Pou","unit_norm":"pou","ipa":"pɔːʊː","phonetic":"p-aw-ew","vars":[],"eng_variants":[]},{"segment_id":564,"unit":"Poo","unit_norm":"poo","ipa":"pɔːɔː","phonetic":"p-aw-aw","vars":[],"eng_variants":[]},{"segment_id":563,"unit":"Poi","unit_norm":"poi","ipa":"pɔːiː","phonetic":"p-aw-ee","vars":[],"eng_variants":[]},{"segment_id":562,"unit":"Poe","unit_norm":"poe","ipa":"pɔːɛh","phonetic":"p-aw-eh","vars":[],"eng_variants":[]},{"segment_id":561,"unit":"Poa","unit_norm":"poa","ipa":"pɔːɑ","phonetic":"p-aw-ah","vars":[],"eng_variants":[]},{"segment_id":560,"unit":"Piu","unit_norm":"piu","ipa":"piːʊː","phonetic":"p-ee-ew","vars":[],"eng_variants":[]},{"segment_id":559,"unit":"Pio","unit_norm":"pio","ipa":"piːɔː","phonetic":"p-ee-aw","vars":[],"eng_variants":[]},{"segment_id":558,"unit":"Pii","unit_norm":"pii","ipa":"piːiː","phonetic":"p-ee-ee","vars":[],"eng_variants":[]},{"segment_id":557,"unit":"Pie","unit_norm":"pie","ipa":"piːɛh","phonetic":"p-ee-eh","vars":[],"eng_variants":[]},{"segment_id":556,"unit":"Pia","unit_norm":"pia","ipa":"piːɑ","phonetic":"p-ee-ah","vars":[],"eng_variants":[]},{"segment_id":555,"unit":"Peu","unit_norm":"peu","ipa":"pɛhʊː","phonetic":"p-eh-ew","vars":[],"eng_variants":[]},{"segment_id":554,"unit":"Peo","unit_norm":"peo","ipa":"pɛhɔː","phonetic":"p-eh-aw","vars":[],"eng_variants":[]},{"segment_id":553,"unit":"Pei","unit_norm":"pei","ipa":"pɛhiː","phonetic":"p-eh-ee","vars":[],"eng_variants":[]},{"segment_id":552,"unit":"Pee","unit_norm":"pee","ipa":"pɛhɛh","phonetic":"p-eh-eh","vars":[],"eng_variants":[]},{"segment_id":551,"unit":"Pea","unit_norm":"pea","ipa":"pɛhɑ","phonetic":"p-eh-ah","vars":[],"eng_variants":[]},{"segment_id":550,"unit":"Pau","unit_norm":"pau","ipa":"pɑʊː","phonetic":"p-ah-ew","vars":[],"eng_variants":[]},{"segment_id":549,"unit":"Pao","unit_norm":"pao","ipa":"pɑɔː","phonetic":"p-ah-aw","vars":[],"eng_variants":[]},{"segment_id":548,"unit":"Pai","unit_norm":"pai","ipa":"pɑiː","phonetic":"p-ah-ee","vars":[],"eng_variants":[]},{"segment_id":547,"unit":"Pae","unit_norm":"pae","ipa":"pɑɛh","phonetic":"p-ah-eh","vars":[],"eng_variants":[]},{"segment_id":546,"unit":"Paa","unit_norm":"paa","ipa":"pɑɑ","phonetic":"p-ah-ah","vars":[],"eng_variants":[]},{"segment_id":545,"unit":"Pū","unit_norm":"pū","ipa":"puː","phonetic":"p-ooh","vars":[],"eng_variants":[]},{"segment_id":544,"unit":"Pō","unit_norm":"pō","ipa":"pɔːr","phonetic":"p-or","vars":[],"eng_variants":[]},{"segment_id":543,"unit":"Pī","unit_norm":"pī","ipa":"piːː","phonetic":"p-eee","vars":[],"eng_variants":[]},{"segment_id":542,"unit":"Pē","unit_norm":"pē","ipa":"pɛː","phonetic":"p-ehh","vars":[],"eng_variants":[]},{"segment_id":541,"unit":"Pā","unit_norm":"pā","ipa":"pɑːː","phonetic":"p-ahh","vars":[{"label":"v1","bracket":"(pa)rt","just_part":"pa"},{"label":"v2","bracket":"(pa)rk","just_part":"pa"},{"label":"v3","bracket":"(pa)r","just_part":"pa"}],"eng_variants":["(pa)rt","(pa)rk","(pa)r"]},{"segment_id":540,"unit":"Pu","unit_norm":"pu","ipa":"pʊː","phonetic":"p-ew","vars":[],"eng_variants":[]},{"segment_id":539,"unit":"Po","unit_norm":"po","ipa":"pɔː","phonetic":"p-aw","vars":[],"eng_variants":[]},{"segment_id":538,"unit":"Pi","unit_norm":"pi","ipa":"piː","phonetic":"p-ee","vars":[],"eng_variants":[]},{"segment_id":537,"unit":"Pe","unit_norm":"pe","ipa":"pɛh","phonetic":"p-eh","vars":[],"eng_variants":[]},{"segment_id":536,"unit":"Pa","unit_norm":"pa","ipa":"pɑ","phonetic":"p-ah","vars":[{"label":"v1","bracket":"(pa)rt","just_part":"pa"},{"label":"v2","bracket":"(pa)rk","just_part":"pa"},{"label":"v3","bracket":"(pa)r","just_part":"pa"}],"eng_variants":["(pa)rt","(pa)rk","(pa)r"]},{"segment_id":535,"unit":"Nūū","unit_norm":"nūū","ipa":"nuːuː","phonetic":"n-ooh-ooh","vars":[],"eng_variants":[]},{"segment_id":534,"unit":"Nuū","unit_norm":"nuū","ipa":"nʊːuː","phonetic":"n-ew-ooh","vars":[],"eng_variants":[]},{"segment_id":533,"unit":"Nūu","unit_norm":"nūu","ipa":"nuːʊː","phonetic":"n-ooh-ew","vars":[],"eng_variants":[]},{"segment_id":532,"unit":"Nūō","unit_norm":"nūō","ipa":"nuːɔːr","phonetic":"n-ooh-or","vars":[],"eng_variants":[]},{"segment_id":531,"unit":"Naō","unit_norm":"naō","ipa":"nɑɔːr","phonetic":"n-ah-or","vars":[],"eng_variants":[]},{"segment_id":530,"unit":"Nūo","unit_norm":"nūo","ipa":"nuːɔː","phonetic":"n-ooh-aw","vars":[],"eng_variants":[]},{"segment_id":529,"unit":"Nūī","unit_norm":"nūī","ipa":"nuːiːː","phonetic":"n-ooh-eee","vars":[],"eng_variants":[]},{"segment_id":528,"unit":"Nuī","unit_norm":"nuī","ipa":"nʊːiːː","phonetic":"n-ew-eee","vars":[],"eng_variants":[]},{"segment_id":527,"unit":"Nūi","unit_norm":"nūi","ipa":"nuːiː","phonetic":"n-ooh-ee","vars":[],"eng_variants":[]},{"segment_id":526,"unit":"Nūē","unit_norm":"nūē","ipa":"nuːɛː","phonetic":"n-ooh-ehh","vars":[],"eng_variants":[]},{"segment_id":525,"unit":"Nūe","unit_norm":"nūe","ipa":"nuːɛh","phonetic":"n-ooh-eh","vars":[],"eng_variants":[]},{"segment_id":524,"unit":"Nūā","unit_norm":"nūā","ipa":"nuːɑːː","phonetic":"n-ooh-ahh","vars":[],"eng_variants":[]},{"segment_id":523,"unit":"Nuā","unit_norm":"nuā","ipa":"nʊːɑːː","phonetic":"n-ew-ahh","vars":[],"eng_variants":[]},{"segment_id":522,"unit":"Nūa","unit_norm":"nūa","ipa":"nuːɑ","phonetic":"n-ooh-ah","vars":[],"eng_variants":[]},{"segment_id":521,"unit":"Nōū","unit_norm":"nōū","ipa":"nɔːruː","phonetic":"n-or-ooh","vars":[],"eng_variants":[]},{"segment_id":520,"unit":"Noū","unit_norm":"noū","ipa":"nɔːuː","phonetic":"n-aw-ooh","vars":[],"eng_variants":[]},{"segment_id":519,"unit":"Nōu","unit_norm":"nōu","ipa":"nɔːrʊː","phonetic":"n-or-ew","vars":[],"eng_variants":[]},{"segment_id":518,"unit":"Nōō","unit_norm":"nōō","ipa":"nɔːrɔːr","phonetic":"n-or-or","vars":[],"eng_variants":[]},{"segment_id":517,"unit":"Noō","unit_norm":"noō","ipa":"nɔːɔːr","phonetic":"n-aw-or","vars":[],"eng_variants":[]},{"segment_id":516,"unit":"Nōo","unit_norm":"nōo","ipa":"nɔːrɔː","phonetic":"n-or-aw","vars":[],"eng_variants":[]},{"segment_id":515,"unit":"Nōī","unit_norm":"nōī","ipa":"nɔːriːː","phonetic":"n-or-eee","vars":[],"eng_variants":[]},{"segment_id":514,"unit":"Noī","unit_norm":"noī","ipa":"nɔːiːː","phonetic":"n-aw-eee","vars":[],"eng_variants":[]},{"segment_id":513,"unit":"Nōi","unit_norm":"nōi","ipa":"nɔːriː","phonetic":"n-or-ee","vars":[],"eng_variants":[]},{"segment_id":512,"unit":"Nōē","unit_norm":"nōē","ipa":"nɔːrɛː","phonetic":"n-or-ehh","vars":[],"eng_variants":[]},{"segment_id":511,"unit":"Nōe","unit_norm":"nōe","ipa":"nɔːrɛh","phonetic":"n-or-eh","vars":[],"eng_variants":[]},{"segment_id":510,"unit":"Nōā","unit_norm":"nōā","ipa":"nɔːrɑːː","phonetic":"n-or-ahh","vars":[],"eng_variants":[]},{"segment_id":509,"unit":"Noā","unit_norm":"noā","ipa":"nɔːɑːː","phonetic":"n-aw-ahh","vars":[],"eng_variants":[]},{"segment_id":508,"unit":"Nōa","unit_norm":"nōa","ipa":"nɔːrɑ","phonetic":"n-or-ah","vars":[],"eng_variants":[]},{"segment_id":507,"unit":"Nīū","unit_norm":"nīū","ipa":"niːːuː","phonetic":"n-eee-ooh","vars":[],"eng_variants":[]},{"segment_id":506,"unit":"Niū","unit_norm":"niū","ipa":"niːuː","phonetic":"n-ee-ooh","vars":[],"eng_variants":[]},{"segment_id":505,"unit":"Nīu","unit_norm":"nīu","ipa":"niːːʊː","phonetic":"n-eee-ew","vars":[],"eng_variants":[]},{"segment_id":504,"unit":"Nīō","unit_norm":"nīō","ipa":"niːːɔːr","phonetic":"n-eee-or","vars":[],"eng_variants":[]},{"segment_id":503,"unit":"Niō","unit_norm":"niō","ipa":"niːɔːr","phonetic":"n-ee-or","vars":[],"eng_variants":[]},{"segment_id":502,"unit":"Nīo","unit_norm":"nīo","ipa":"niːːɔː","phonetic":"n-eee-aw","vars":[],"eng_variants":[]},{"segment_id":501,"unit":"Nīī","unit_norm":"nīī","ipa":"niːːiːː","phonetic":"n-eee-eee","vars":[],"eng_variants":[]},{"segment_id":500,"unit":"Niī","unit_norm":"niī","ipa":"niːiːː","phonetic":"n-ee-eee","vars":[],"eng_variants":[]},{"segment_id":499,"unit":"Nīi","unit_norm":"nīi","ipa":"niːːiː","phonetic":"n-eee-ee","vars":[],"eng_variants":[]},{"segment_id":498,"unit":"Nīē","unit_norm":"nīē","ipa":"niːːɛː","phonetic":"n-eee-ehh","vars":[],"eng_variants":[]},{"segment_id":497,"unit":"Nīe","unit_norm":"nīe","ipa":"niːːɛh","phonetic":"n-eee-eh","vars":[],"eng_variants":[]},{"segment_id":496,"unit":"Nīā","unit_norm":"nīā","ipa":"niːːɑːː","phonetic":"n-eee-ahh","vars":[],"eng_variants":[]},{"segment_id":495,"unit":"Niā","unit_norm":"niā","ipa":"niːɑːː","phonetic":"n-ee-ahh","vars":[],"eng_variants":[]},{"segment_id":494,"unit":"Nīa","unit_norm":"nīa","ipa":"niːːɑ","phonetic":"n-eee-ah","vars":[],"eng_variants":[]},{"segment_id":493,"unit":"Nēū","unit_norm":"nēū","ipa":"nɛːuː","phonetic":"n-ehh-ooh","vars":[],"eng_variants":[]},{"segment_id":492,"unit":"Neū","unit_norm":"neū","ipa":"nɛhuː","phonetic":"n-eh-ooh","vars":[],"eng_variants":[]},{"segment_id":491,"unit":"Nēu","unit_norm":"nēu","ipa":"nɛːʊː","phonetic":"n-ehh-ew","vars":[],"eng_variants":[]},{"segment_id":490,"unit":"Nēō","unit_norm":"nēō","ipa":"nɛːɔːr","phonetic":"n-ehh-or","vars":[],"eng_variants":[]},{"segment_id":489,"unit":"Neō","unit_norm":"neō","ipa":"nɛhɔːr","phonetic":"n-eh-or","vars":[],"eng_variants":[]},{"segment_id":488,"unit":"Nēo","unit_norm":"nēo","ipa":"nɛːɔː","phonetic":"n-ehh-aw","vars":[],"eng_variants":[]},{"segment_id":487,"unit":"Nēī","unit_norm":"nēī","ipa":"nɛːiːː","phonetic":"n-ehh-eee","vars":[],"eng_variants":[]},{"segment_id":486,"unit":"Neī","unit_norm":"neī","ipa":"nɛhiːː","phonetic":"n-eh-eee","vars":[],"eng_variants":[]},{"segment_id":485,"unit":"Nēi","unit_norm":"nēi","ipa":"nɛːiː","phonetic":"n-ehh-ee","vars":[],"eng_variants":[]},{"segment_id":484,"unit":"Nēē","unit_norm":"nēē","ipa":"nɛːɛː","phonetic":"n-ehh-ehh","vars":[],"eng_variants":[]},{"segment_id":483,"unit":"Nēe","unit_norm":"nēe","ipa":"nɛːɛh","phonetic":"n-ehh-eh","vars":[],"eng_variants":[]},{"segment_id":482,"unit":"Nēā","unit_norm":"nēā","ipa":"nɛːɑːː","phonetic":"n-ehh-ahh","vars":[],"eng_variants":[]},{"segment_id":481,"unit":"Neā","unit_norm":"neā","ipa":"nɛhɑːː","phonetic":"n-eh-ahh","vars":[],"eng_variants":[]},{"segment_id":480,"unit":"Nēa","unit_norm":"nēa","ipa":"nɛːɑ","phonetic":"n-ehh-ah","vars":[],"eng_variants":[]},{"segment_id":479,"unit":"Nāū","unit_norm":"nāū","ipa":"nɑːːuː","phonetic":"n-ahh-ooh","vars":[],"eng_variants":[]},{"segment_id":478,"unit":"Naū","unit_norm":"naū","ipa":"nɑuː","phonetic":"n-ah-ooh","vars":[],"eng_variants":[]},{"segment_id":477,"unit":"Nāu","unit_norm":"nāu","ipa":"nɑːːʊː","phonetic":"n-ahh-ew","vars":[],"eng_variants":[]},{"segment_id":476,"unit":"Nāō","unit_norm":"nāō","ipa":"nɑːːɔːr","phonetic":"n-ahh-or","vars":[],"eng_variants":[]},{"segment_id":475,"unit":"Naō","unit_norm":"naō","ipa":"nɑɔːr","phonetic":"n-ah-or","vars":[],"eng_variants":[]},{"segment_id":474,"unit":"Nāo","unit_norm":"nāo","ipa":"nɑːːɔː","phonetic":"n-ahh-aw","vars":[],"eng_variants":[]},{"segment_id":473,"unit":"Nāī","unit_norm":"nāī","ipa":"nɑːːiːː","phonetic":"n-ahh-eee","vars":[],"eng_variants":[]},{"segment_id":472,"unit":"Naī","unit_norm":"naī","ipa":"nɑiːː","phonetic":"n-ah-eee","vars":[],"eng_variants":[]},{"segment_id":471,"unit":"Nāi","unit_norm":"nāi","ipa":"nɑːːiː","phonetic":"n-ahh-ee","vars":[],"eng_variants":[]},{"segment_id":470,"unit":"Nāē","unit_norm":"nāē","ipa":"nɑːːɛː","phonetic":"n-ahh-ehh","vars":[],"eng_variants":[]},{"segment_id":469,"unit":"Nāe","unit_norm":"nāe","ipa":"nɑːːɛh","phonetic":"n-ahh-eh","vars":[],"eng_variants":[]},{"segment_id":468,"unit":"Nāā","unit_norm":"nāā","ipa":"nɑːːɑːː","phonetic":"n-ahh-ahh","vars":[],"eng_variants":[]},{"segment_id":467,"unit":"Naā","unit_norm":"naā","ipa":"nɑɑːː","phonetic":"n-ah-ahh","vars":[],"eng_variants":[]},{"segment_id":466,"unit":"Nāa","unit_norm":"nāa","ipa":"nɑːːɑ","phonetic":"n-ahh-ah","vars":[],"eng_variants":[]},{"segment_id":465,"unit":"Nuu","unit_norm":"nuu","ipa":"nʊːʊː","phonetic":"n-ew-ew","vars":[],"eng_variants":[]},{"segment_id":464,"unit":"Nuo","unit_norm":"nuo","ipa":"nʊːɔː","phonetic":"n-ew-aw","vars":[],"eng_variants":[]},{"segment_id":463,"unit":"Nui","unit_norm":"nui","ipa":"nʊːiː","phonetic":"n-ew-ee","vars":[],"eng_variants":[]},{"segment_id":462,"unit":"Nue","unit_norm":"nue","ipa":"nʊːɛh","phonetic":"n-ew-eh","vars":[],"eng_variants":[]},{"segment_id":461,"unit":"Nua","unit_norm":"nua","ipa":"nʊːɑ","phonetic":"n-ew-ah","vars":[],"eng_variants":[]},{"segment_id":460,"unit":"Nou","unit_norm":"nou","ipa":"nɔːʊː","phonetic":"n-aw-ew","vars":[],"eng_variants":[]},{"segment_id":459,"unit":"Noo","unit_norm":"noo","ipa":"nɔːɔː","phonetic":"n-aw-aw","vars":[],"eng_variants":[]},{"segment_id":458,"unit":"Noi","unit_norm":"noi","ipa":"nɔːiː","phonetic":"n-aw-ee","vars":[],"eng_variants":[]},{"segment_id":457,"unit":"Noe","unit_norm":"noe","ipa":"nɔːɛh","phonetic":"n-aw-eh","vars":[],"eng_variants":[]},{"segment_id":456,"unit":"Noa","unit_norm":"noa","ipa":"nɔːɑ","phonetic":"n-aw-ah","vars":[],"eng_variants":[]},{"segment_id":455,"unit":"Niu","unit_norm":"niu","ipa":"niːʊː","phonetic":"n-ee-ew","vars":[],"eng_variants":[]},{"segment_id":454,"unit":"Nio","unit_norm":"nio","ipa":"niːɔː","phonetic":"n-ee-aw","vars":[],"eng_variants":[]},{"segment_id":453,"unit":"Nii","unit_norm":"nii","ipa":"niːiː","phonetic":"n-ee-ee","vars":[],"eng_variants":[]},{"segment_id":452,"unit":"Nie","unit_norm":"nie","ipa":"niːɛh","phonetic":"n-ee-eh","vars":[],"eng_variants":[]},{"segment_id":451,"unit":"Nia","unit_norm":"nia","ipa":"niːɑ","phonetic":"n-ee-ah","vars":[],"eng_variants":[]},{"segment_id":450,"unit":"Neu","unit_norm":"neu","ipa":"nɛhʊː","phonetic":"n-eh-ew","vars":[],"eng_variants":[]},{"segment_id":449,"unit":"Neo","unit_norm":"neo","ipa":"nɛhɔː","phonetic":"n-eh-aw","vars":[],"eng_variants":[]},{"segment_id":448,"unit":"Nei","unit_norm":"nei","ipa":"nɛhiː","phonetic":"n-eh-ee","vars":[],"eng_variants":[]},{"segment_id":447,"unit":"Nee","unit_norm":"nee","ipa":"nɛhɛh","phonetic":"n-eh-eh","vars":[],"eng_variants":[]},{"segment_id":446,"unit":"Nea","unit_norm":"nea","ipa":"nɛhɑ","phonetic":"n-eh-ah","vars":[],"eng_variants":[]},{"segment_id":445,"unit":"Nau","unit_norm":"nau","ipa":"nɑʊː","phonetic":"n-ah-ew","vars":[],"eng_variants":[]},{"segment_id":444,"unit":"Nao","unit_norm":"nao","ipa":"nɑɔː","phonetic":"n-ah-aw","vars":[],"eng_variants":[]},{"segment_id":443,"unit":"Nai","unit_norm":"nai","ipa":"nɑiː","phonetic":"n-ah-ee","vars":[],"eng_variants":[]},{"segment_id":442,"unit":"Nae","unit_norm":"nae","ipa":"nɑɛh","phonetic":"n-ah-eh","vars":[],"eng_variants":[]},{"segment_id":441,"unit":"Naa","unit_norm":"naa","ipa":"nɑɑ","phonetic":"n-ah-ah","vars":[],"eng_variants":[]},{"segment_id":440,"unit":"Nū","unit_norm":"nū","ipa":"nuː","phonetic":"n-ooh","vars":[],"eng_variants":[]},{"segment_id":439,"unit":"Nō","unit_norm":"nō","ipa":"nɔːr","phonetic":"n-or","vars":[],"eng_variants":[]},{"segment_id":438,"unit":"Nī","unit_norm":"nī","ipa":"niːː","phonetic":"n-eee","vars":[],"eng_variants":[]},{"segment_id":437,"unit":"Nē","unit_norm":"nē","ipa":"nɛː","phonetic":"n-ehh","vars":[],"eng_variants":[]},{"segment_id":436,"unit":"Nā","unit_norm":"nā","ipa":"nɑːː","phonetic":"n-ahh","vars":[],"eng_variants":[]},{"segment_id":435,"unit":"Nu","unit_norm":"nu","ipa":"nʊː","phonetic":"n-ew","vars":[],"eng_variants":[]},{"segment_id":434,"unit":"No","unit_norm":"no","ipa":"nɔː","phonetic":"n-aw","vars":[],"eng_variants":[]},{"segment_id":433,"unit":"Ni","unit_norm":"ni","ipa":"niː","phonetic":"n-ee","vars":[],"eng_variants":[]},{"segment_id":432,"unit":"Ne","unit_norm":"ne","ipa":"nɛh","phonetic":"n-eh","vars":[],"eng_variants":[]},{"segment_id":431,"unit":"Na","unit_norm":"na","ipa":"nɑ","phonetic":"n-ah","vars":[],"eng_variants":[]},{"segment_id":430,"unit":"Mūū","unit_norm":"mūū","ipa":"muːuː","phonetic":"m-ooh-ooh","vars":[],"eng_variants":[]},{"segment_id":429,"unit":"Muū","unit_norm":"muū","ipa":"mʊːuː","phonetic":"m-ew-ooh","vars":[],"eng_variants":[]},{"segment_id":428,"unit":"Mūu","unit_norm":"mūu","ipa":"muːʊː","phonetic":"m-ooh-ew","vars":[],"eng_variants":[]},{"segment_id":427,"unit":"Mūō","unit_norm":"mūō","ipa":"muːɔːr","phonetic":"m-ooh-or","vars":[],"eng_variants":[]},{"segment_id":426,"unit":"Maō","unit_norm":"maō","ipa":"mɑɔːr","phonetic":"m-ah-or","vars":[],"eng_variants":[]},{"segment_id":425,"unit":"Mūo","unit_norm":"mūo","ipa":"muːɔː","phonetic":"m-ooh-aw","vars":[],"eng_variants":[]},{"segment_id":424,"unit":"Mūī","unit_norm":"mūī","ipa":"muːiːː","phonetic":"m-ooh-eee","vars":[],"eng_variants":[]},{"segment_id":423,"unit":"Muī","unit_norm":"muī","ipa":"mʊːiːː","phonetic":"m-ew-eee","vars":[],"eng_variants":[]},{"segment_id":422,"unit":"Mūi","unit_norm":"mūi","ipa":"muːiː","phonetic":"m-ooh-ee","vars":[],"eng_variants":[]},{"segment_id":421,"unit":"Mūē","unit_norm":"mūē","ipa":"muːɛː","phonetic":"m-ooh-ehh","vars":[],"eng_variants":[]},{"segment_id":420,"unit":"Mūe","unit_norm":"mūe","ipa":"muːɛh","phonetic":"m-ooh-eh","vars":[],"eng_variants":[]},{"segment_id":419,"unit":"Mūā","unit_norm":"mūā","ipa":"muːɑːː","phonetic":"m-ooh-ahh","vars":[],"eng_variants":[]},{"segment_id":418,"unit":"Muā","unit_norm":"muā","ipa":"mʊːɑːː","phonetic":"m-ew-ahh","vars":[],"eng_variants":[]},{"segment_id":417,"unit":"Mūa","unit_norm":"mūa","ipa":"muːɑ","phonetic":"m-ooh-ah","vars":[],"eng_variants":[]},{"segment_id":416,"unit":"Mōū","unit_norm":"mōū","ipa":"mɔːruː","phonetic":"m-or-ooh","vars":[],"eng_variants":[]},{"segment_id":415,"unit":"Moū","unit_norm":"moū","ipa":"mɔːuː","phonetic":"m-aw-ooh","vars":[],"eng_variants":[]},{"segment_id":414,"unit":"Mōu","unit_norm":"mōu","ipa":"mɔːrʊː","phonetic":"m-or-ew","vars":[],"eng_variants":[]},{"segment_id":413,"unit":"Mōō","unit_norm":"mōō","ipa":"mɔːrɔːr","phonetic":"m-or-or","vars":[],"eng_variants":[]},{"segment_id":412,"unit":"Moō","unit_norm":"moō","ipa":"mɔːɔːr","phonetic":"m-aw-or","vars":[],"eng_variants":[]},{"segment_id":411,"unit":"Mōo","unit_norm":"mōo","ipa":"mɔːrɔː","phonetic":"m-or-aw","vars":[],"eng_variants":[]},{"segment_id":410,"unit":"Mōī","unit_norm":"mōī","ipa":"mɔːriːː","phonetic":"m-or-eee","vars":[],"eng_variants":[]},{"segment_id":409,"unit":"Moī","unit_norm":"moī","ipa":"mɔːiːː","phonetic":"m-aw-eee","vars":[],"eng_variants":[]},{"segment_id":408,"unit":"Mōi","unit_norm":"mōi","ipa":"mɔːriː","phonetic":"m-or-ee","vars":[],"eng_variants":[]},{"segment_id":407,"unit":"Mōē","unit_norm":"mōē","ipa":"mɔːrɛː","phonetic":"m-or-ehh","vars":[],"eng_variants":[]},{"segment_id":406,"unit":"Mōe","unit_norm":"mōe","ipa":"mɔːrɛh","phonetic":"m-or-eh","vars":[],"eng_variants":[]},{"segment_id":405,"unit":"Mōā","unit_norm":"mōā","ipa":"mɔːrɑːː","phonetic":"m-or-ahh","vars":[],"eng_variants":[]},{"segment_id":404,"unit":"Moā","unit_norm":"moā","ipa":"mɔːɑːː","phonetic":"m-aw-ahh","vars":[],"eng_variants":[]},{"segment_id":403,"unit":"Mōa","unit_norm":"mōa","ipa":"mɔːrɑ","phonetic":"m-or-ah","vars":[],"eng_variants":[]},{"segment_id":402,"unit":"Mīū","unit_norm":"mīū","ipa":"miːːuː","phonetic":"m-eee-ooh","vars":[],"eng_variants":[]},{"segment_id":401,"unit":"Miū","unit_norm":"miū","ipa":"miːuː","phonetic":"m-ee-ooh","vars":[],"eng_variants":[]},{"segment_id":400,"unit":"Mīu","unit_norm":"mīu","ipa":"miːːʊː","phonetic":"m-eee-ew","vars":[],"eng_variants":[]},{"segment_id":399,"unit":"Mīō","unit_norm":"mīō","ipa":"miːːɔːr","phonetic":"m-eee-or","vars":[],"eng_variants":[]},{"segment_id":398,"unit":"Miō","unit_norm":"miō","ipa":"miːɔːr","phonetic":"m-ee-or","vars":[],"eng_variants":[]},{"segment_id":397,"unit":"Mīo","unit_norm":"mīo","ipa":"miːːɔː","phonetic":"m-eee-aw","vars":[],"eng_variants":[]},{"segment_id":396,"unit":"Mīī","unit_norm":"mīī","ipa":"miːːiːː","phonetic":"m-eee-eee","vars":[],"eng_variants":[]},{"segment_id":395,"unit":"Miī","unit_norm":"miī","ipa":"miːiːː","phonetic":"m-ee-eee","vars":[],"eng_variants":[]},{"segment_id":394,"unit":"Mīi","unit_norm":"mīi","ipa":"miːːiː","phonetic":"m-eee-ee","vars":[],"eng_variants":[]},{"segment_id":393,"unit":"Mīē","unit_norm":"mīē","ipa":"miːːɛː","phonetic":"m-eee-ehh","vars":[],"eng_variants":[]},{"segment_id":392,"unit":"Mīe","unit_norm":"mīe","ipa":"miːːɛh","phonetic":"m-eee-eh","vars":[],"eng_variants":[]},{"segment_id":391,"unit":"Mīā","unit_norm":"mīā","ipa":"miːːɑːː","phonetic":"m-eee-ahh","vars":[],"eng_variants":[]},{"segment_id":390,"unit":"Miā","unit_norm":"miā","ipa":"miːɑːː","phonetic":"m-ee-ahh","vars":[],"eng_variants":[]},{"segment_id":389,"unit":"Mīa","unit_norm":"mīa","ipa":"miːːɑ","phonetic":"m-eee-ah","vars":[],"eng_variants":[]},{"segment_id":388,"unit":"Mēū","unit_norm":"mēū","ipa":"mɛːuː","phonetic":"m-ehh-ooh","vars":[],"eng_variants":[]},{"segment_id":387,"unit":"Meū","unit_norm":"meū","ipa":"mɛhuː","phonetic":"m-eh-ooh","vars":[],"eng_variants":[]},{"segment_id":386,"unit":"Mēu","unit_norm":"mēu","ipa":"mɛːʊː","phonetic":"m-ehh-ew","vars":[],"eng_variants":[]},{"segment_id":385,"unit":"Mēō","unit_norm":"mēō","ipa":"mɛːɔːr","phonetic":"m-ehh-or","vars":[],"eng_variants":[]},{"segment_id":384,"unit":"Meō","unit_norm":"meō","ipa":"mɛhɔːr","phonetic":"m-eh-or","vars":[],"eng_variants":[]},{"segment_id":383,"unit":"Mēo","unit_norm":"mēo","ipa":"mɛːɔː","phonetic":"m-ehh-aw","vars":[],"eng_variants":[]},{"segment_id":382,"unit":"Mēī","unit_norm":"mēī","ipa":"mɛːiːː","phonetic":"m-ehh-eee","vars":[],"eng_variants":[]},{"segment_id":381,"unit":"Meī","unit_norm":"meī","ipa":"mɛhiːː","phonetic":"m-eh-eee","vars":[],"eng_variants":[]},{"segment_id":380,"unit":"Mēi","unit_norm":"mēi","ipa":"mɛːiː","phonetic":"m-ehh-ee","vars":[],"eng_variants":[]},{"segment_id":379,"unit":"Mēē","unit_norm":"mēē","ipa":"mɛːɛː","phonetic":"m-ehh-ehh","vars":[],"eng_variants":[]},{"segment_id":378,"unit":"Mēe","unit_norm":"mēe","ipa":"mɛːɛh","phonetic":"m-ehh-eh","vars":[],"eng_variants":[]},{"segment_id":377,"unit":"Mēā","unit_norm":"mēā","ipa":"mɛːɑːː","phonetic":"m-ehh-ahh","vars":[],"eng_variants":[]},{"segment_id":376,"unit":"Meā","unit_norm":"meā","ipa":"mɛhɑːː","phonetic":"m-eh-ahh","vars":[],"eng_variants":[]},{"segment_id":375,"unit":"Mēa","unit_norm":"mēa","ipa":"mɛːɑ","phonetic":"m-ehh-ah","vars":[],"eng_variants":[]},{"segment_id":374,"unit":"Māū","unit_norm":"māū","ipa":"mɑːːuː","phonetic":"m-ahh-ooh","vars":[],"eng_variants":[]},{"segment_id":373,"unit":"Maū","unit_norm":"maū","ipa":"mɑuː","phonetic":"m-ah-ooh","vars":[],"eng_variants":[]},{"segment_id":372,"unit":"Māu","unit_norm":"māu","ipa":"mɑːːʊː","phonetic":"m-ahh-ew","vars":[],"eng_variants":[]},{"segment_id":371,"unit":"Māō","unit_norm":"māō","ipa":"mɑːːɔːr","phonetic":"m-ahh-or","vars":[],"eng_variants":[]},{"segment_id":370,"unit":"Maō","unit_norm":"maō","ipa":"mɑɔːr","phonetic":"m-ah-or","vars":[],"eng_variants":[]},{"segment_id":369,"unit":"Māo","unit_norm":"māo","ipa":"mɑːːɔː","phonetic":"m-ahh-aw","vars":[],"eng_variants":[]},{"segment_id":368,"unit":"Māī","unit_norm":"māī","ipa":"mɑːːiːː","phonetic":"m-ahh-eee","vars":[],"eng_variants":[]},{"segment_id":367,"unit":"Maī","unit_norm":"maī","ipa":"mɑiːː","phonetic":"m-ah-eee","vars":[],"eng_variants":[]},{"segment_id":366,"unit":"Māi","unit_norm":"māi","ipa":"mɑːːiː","phonetic":"m-ahh-ee","vars":[],"eng_variants":[]},{"segment_id":365,"unit":"Māē","unit_norm":"māē","ipa":"mɑːːɛː","phonetic":"m-ahh-ehh","vars":[],"eng_variants":[]},{"segment_id":364,"unit":"Māe","unit_norm":"māe","ipa":"mɑːːɛh","phonetic":"m-ahh-eh","vars":[],"eng_variants":[]},{"segment_id":363,"unit":"Māā","unit_norm":"māā","ipa":"mɑːːɑːː","phonetic":"m-ahh-ahh","vars":[],"eng_variants":[]},{"segment_id":362,"unit":"Maā","unit_norm":"maā","ipa":"mɑɑːː","phonetic":"m-ah-ahh","vars":[],"eng_variants":[]},{"segment_id":361,"unit":"Māa","unit_norm":"māa","ipa":"mɑːːɑ","phonetic":"m-ahh-ah","vars":[],"eng_variants":[]},{"segment_id":360,"unit":"Muu","unit_norm":"muu","ipa":"mʊːʊː","phonetic":"m-ew-ew","vars":[],"eng_variants":[]},{"segment_id":359,"unit":"Muo","unit_norm":"muo","ipa":"mʊːɔː","phonetic":"m-ew-aw","vars":[],"eng_variants":[]},{"segment_id":358,"unit":"Mui","unit_norm":"mui","ipa":"mʊːiː","phonetic":"m-ew-ee","vars":[],"eng_variants":[]},{"segment_id":357,"unit":"Mue","unit_norm":"mue","ipa":"mʊːɛh","phonetic":"m-ew-eh","vars":[],"eng_variants":[]},{"segment_id":356,"unit":"Mua","unit_norm":"mua","ipa":"mʊːɑ","phonetic":"m-ew-ah","vars":[],"eng_variants":[]},{"segment_id":355,"unit":"Mou","unit_norm":"mou","ipa":"mɔːʊː","phonetic":"m-aw-ew","vars":[],"eng_variants":[]},{"segment_id":354,"unit":"Moo","unit_norm":"moo","ipa":"mɔːɔː","phonetic":"m-aw-aw","vars":[],"eng_variants":[]},{"segment_id":353,"unit":"Moi","unit_norm":"moi","ipa":"mɔːiː","phonetic":"m-aw-ee","vars":[],"eng_variants":[]},{"segment_id":352,"unit":"Moe","unit_norm":"moe","ipa":"mɔːɛh","phonetic":"m-aw-eh","vars":[],"eng_variants":[]},{"segment_id":351,"unit":"Moa","unit_norm":"moa","ipa":"mɔːɑ","phonetic":"m-aw-ah","vars":[],"eng_variants":[]},{"segment_id":350,"unit":"Miu","unit_norm":"miu","ipa":"miːʊː","phonetic":"m-ee-ew","vars":[],"eng_variants":[]},{"segment_id":349,"unit":"Mio","unit_norm":"mio","ipa":"miːɔː","phonetic":"m-ee-aw","vars":[],"eng_variants":[]},{"segment_id":348,"unit":"Mii","unit_norm":"mii","ipa":"miːiː","phonetic":"m-ee-ee","vars":[{"label":"v1","bracket":"(me)","just_part":"me"},{"label":"v2","bracket":"(me)an","just_part":"me"},{"label":"v3","bracket":"(mee)k","just_part":"mee"}],"eng_variants":["(me)","(me)an","(mee)k"]},{"segment_id":347,"unit":"Mie","unit_norm":"mie","ipa":"miːɛh","phonetic":"m-ee-eh","vars":[],"eng_variants":[]},{"segment_id":346,"unit":"Mia","unit_norm":"mia","ipa":"miːɑ","phonetic":"m-ee-ah","vars":[],"eng_variants":[]},{"segment_id":345,"unit":"Meu","unit_norm":"meu","ipa":"mɛhʊː","phonetic":"m-eh-ew","vars":[],"eng_variants":[]},{"segment_id":344,"unit":"Meo","unit_norm":"meo","ipa":"mɛhɔː","phonetic":"m-eh-aw","vars":[],"eng_variants":[]},{"segment_id":343,"unit":"Mei","unit_norm":"mei","ipa":"mɛhiː","phonetic":"m-eh-ee","vars":[],"eng_variants":[]},{"segment_id":342,"unit":"Mee","unit_norm":"mee","ipa":"mɛhɛh","phonetic":"m-eh-eh","vars":[],"eng_variants":[]},{"segment_id":341,"unit":"Mea","unit_norm":"mea","ipa":"mɛhɑ","phonetic":"m-eh-ah","vars":[],"eng_variants":[]},{"segment_id":340,"unit":"Mau","unit_norm":"mau","ipa":"mɑʊː","phonetic":"m-ah-ew","vars":[],"eng_variants":[]},{"segment_id":339,"unit":"Mao","unit_norm":"mao","ipa":"mɑɔː","phonetic":"m-ah-aw","vars":[],"eng_variants":[]},{"segment_id":338,"unit":"Mai","unit_norm":"mai","ipa":"mɑiː","phonetic":"m-ah-ee","vars":[],"eng_variants":[]},{"segment_id":337,"unit":"Mae","unit_norm":"mae","ipa":"mɑɛh","phonetic":"m-ah-eh","vars":[],"eng_variants":[]},{"segment_id":336,"unit":"Maa","unit_norm":"maa","ipa":"mɑɑ","phonetic":"m-ah-ah","vars":[],"eng_variants":[]},{"segment_id":335,"unit":"Mū","unit_norm":"mū","ipa":"muː","phonetic":"m-ooh","vars":[],"eng_variants":[]},{"segment_id":334,"unit":"Mō","unit_norm":"mō","ipa":"mɔːr","phonetic":"m-or","vars":[],"eng_variants":[]},{"segment_id":333,"unit":"Mī","unit_norm":"mī","ipa":"miːː","phonetic":"m-eee","vars":[],"eng_variants":[]},{"segment_id":332,"unit":"Mē","unit_norm":"mē","ipa":"mɛː","phonetic":"m-ehh","vars":[],"eng_variants":[]},{"segment_id":331,"unit":"Mā","unit_norm":"mā","ipa":"mɑːː","phonetic":"m-ahh","vars":[{"label":"v1","bracket":"(mu)scle","just_part":"mu"},{"label":"v2","bracket":"(mo)ney","just_part":"mo"},{"label":"v3","bracket":"(mu)d","just_part":"mu"},{"label":"v4","bracket":"(mu)m","just_part":"mu"}],"eng_variants":["(mu)scle","(mo)ney","(mu)d","(mu)m"]},{"segment_id":330,"unit":"Mu","unit_norm":"mu","ipa":"mʊː","phonetic":"m-ew","vars":[],"eng_variants":[]},{"segment_id":329,"unit":"Mo","unit_norm":"mo","ipa":"mɔː","phonetic":"m-aw","vars":[],"eng_variants":[]},{"segment_id":328,"unit":"Mi","unit_norm":"mi","ipa":"miː","phonetic":"m-ee","vars":[],"eng_variants":[]},{"segment_id":327,"unit":"Me","unit_norm":"me","ipa":"mɛh","phonetic":"m-eh","vars":[],"eng_variants":[]},{"segment_id":326,"unit":"Ma","unit_norm":"ma","ipa":"mɑ","phonetic":"m-ah","vars":[{"label":"v1","bracket":"(mu)scle","just_part":"mu"},{"label":"v2","bracket":"(mo)ney","just_part":"mo"},{"label":"v3","bracket":"(mu)d","just_part":"mu"},{"label":"v4","bracket":"(mu)m","just_part":"mu"}],"eng_variants":["(mu)scle","(mo)ney","(mu)d","(mu)m"]},{"segment_id":325,"unit":"Kūū","unit_norm":"kūū","ipa":"kuːuː","phonetic":"k-ooh-ooh","vars":[],"eng_variants":[]},{"segment_id":324,"unit":"Kuū","unit_norm":"kuū","ipa":"kʊːuː","phonetic":"k-ew-ooh","vars":[],"eng_variants":[]},{"segment_id":323,"unit":"Kūu","unit_norm":"kūu","ipa":"kuːʊː","phonetic":"k-ooh-ew","vars":[],"eng_variants":[]},{"segment_id":322,"unit":"Kūō","unit_norm":"kūō","ipa":"kuːɔːr","phonetic":"k-ooh-or","vars":[],"eng_variants":[]},{"segment_id":321,"unit":"Kaō","unit_norm":"kaō","ipa":"kɑɔːr","phonetic":"k-ah-or","vars":[],"eng_variants":[]},{"segment_id":320,"unit":"Kūo","unit_norm":"kūo","ipa":"kuːɔː","phonetic":"k-ooh-aw","vars":[],"eng_variants":[]},{"segment_id":319,"unit":"Kūī","unit_norm":"kūī","ipa":"kuːiːː","phonetic":"k-ooh-eee","vars":[],"eng_variants":[]},{"segment_id":318,"unit":"Kuī","unit_norm":"kuī","ipa":"kʊːiːː","phonetic":"k-ew-eee","vars":[],"eng_variants":[]},{"segment_id":317,"unit":"Kūi","unit_norm":"kūi","ipa":"kuːiː","phonetic":"k-ooh-ee","vars":[],"eng_variants":[]},{"segment_id":316,"unit":"Kūē","unit_norm":"kūē","ipa":"kuːɛː","phonetic":"k-ooh-ehh","vars":[],"eng_variants":[]},{"segment_id":315,"unit":"Kūe","unit_norm":"kūe","ipa":"kuːɛh","phonetic":"k-ooh-eh","vars":[],"eng_variants":[]},{"segment_id":314,"unit":"Kūā","unit_norm":"kūā","ipa":"kuːɑːː","phonetic":"k-ooh-ahh","vars":[],"eng_variants":[]},{"segment_id":313,"unit":"Kuā","unit_norm":"kuā","ipa":"kʊːɑːː","phonetic":"k-ew-ahh","vars":[],"eng_variants":[]},{"segment_id":312,"unit":"Kūa","unit_norm":"kūa","ipa":"kuːɑ","phonetic":"k-ooh-ah","vars":[],"eng_variants":[]},{"segment_id":311,"unit":"Kōū","unit_norm":"kōū","ipa":"kɔːruː","phonetic":"k-or-ooh","vars":[],"eng_variants":[]},{"segment_id":310,"unit":"Koū","unit_norm":"koū","ipa":"kɔːuː","phonetic":"k-aw-ooh","vars":[],"eng_variants":[]},{"segment_id":309,"unit":"Kōu","unit_norm":"kōu","ipa":"kɔːrʊː","phonetic":"k-or-ew","vars":[],"eng_variants":[]},{"segment_id":308,"unit":"Kōō","unit_norm":"kōō","ipa":"kɔːrɔːr","phonetic":"k-or-or","vars":[],"eng_variants":[]},{"segment_id":307,"unit":"Koō","unit_norm":"koō","ipa":"kɔːɔːr","phonetic":"k-aw-or","vars":[],"eng_variants":[]},{"segment_id":306,"unit":"Kōo","unit_norm":"kōo","ipa":"kɔːrɔː","phonetic":"k-or-aw","vars":[],"eng_variants":[]},{"segment_id":305,"unit":"Kōī","unit_norm":"kōī","ipa":"kɔːriːː","phonetic":"k-or-eee","vars":[],"eng_variants":[]},{"segment_id":304,"unit":"Koī","unit_norm":"koī","ipa":"kɔːiːː","phonetic":"k-aw-eee","vars":[],"eng_variants":[]},{"segment_id":303,"unit":"Kōi","unit_norm":"kōi","ipa":"kɔːriː","phonetic":"k-or-ee","vars":[],"eng_variants":[]},{"segment_id":302,"unit":"Kōē","unit_norm":"kōē","ipa":"kɔːrɛː","phonetic":"k-or-ehh","vars":[],"eng_variants":[]},{"segment_id":301,"unit":"Kōe","unit_norm":"kōe","ipa":"kɔːrɛh","phonetic":"k-or-eh","vars":[],"eng_variants":[]},{"segment_id":300,"unit":"Kōā","unit_norm":"kōā","ipa":"kɔːrɑːː","phonetic":"k-or-ahh","vars":[],"eng_variants":[]},{"segment_id":299,"unit":"Koā","unit_norm":"koā","ipa":"kɔːɑːː","phonetic":"k-aw-ahh","vars":[],"eng_variants":[]},{"segment_id":298,"unit":"Kōa","unit_norm":"kōa","ipa":"kɔːrɑ","phonetic":"k-or-ah","vars":[],"eng_variants":[]},{"segment_id":297,"unit":"Kīū","unit_norm":"kīū","ipa":"kiːːuː","phonetic":"k-eee-ooh","vars":[],"eng_variants":[]},{"segment_id":296,"unit":"Kiū","unit_norm":"kiū","ipa":"kiːuː","phonetic":"k-ee-ooh","vars":[],"eng_variants":[]},{"segment_id":295,"unit":"Kīu","unit_norm":"kīu","ipa":"kiːːʊː","phonetic":"k-eee-ew","vars":[],"eng_variants":[]},{"segment_id":294,"unit":"Kīō","unit_norm":"kīō","ipa":"kiːːɔːr","phonetic":"k-eee-or","vars":[],"eng_variants":[]},{"segment_id":293,"unit":"Kiō","unit_norm":"kiō","ipa":"kiːɔːr","phonetic":"k-ee-or","vars":[],"eng_variants":[]},{"segment_id":292,"unit":"Kīo","unit_norm":"kīo","ipa":"kiːːɔː","phonetic":"k-eee-aw","vars":[],"eng_variants":[]},{"segment_id":291,"unit":"Kīī","unit_norm":"kīī","ipa":"kiːːiːː","phonetic":"k-eee-eee","vars":[],"eng_variants":[]},{"segment_id":290,"unit":"Kiī","unit_norm":"kiī","ipa":"kiːiːː","phonetic":"k-ee-eee","vars":[],"eng_variants":[]},{"segment_id":289,"unit":"Kīi","unit_norm":"kīi","ipa":"kiːːiː","phonetic":"k-eee-ee","vars":[],"eng_variants":[]},{"segment_id":288,"unit":"Kīē","unit_norm":"kīē","ipa":"kiːːɛː","phonetic":"k-eee-ehh","vars":[],"eng_variants":[]},{"segment_id":287,"unit":"Kīe","unit_norm":"kīe","ipa":"kiːːɛh","phonetic":"k-eee-eh","vars":[],"eng_variants":[]},{"segment_id":286,"unit":"Kīā","unit_norm":"kīā","ipa":"kiːːɑːː","phonetic":"k-eee-ahh","vars":[],"eng_variants":[]},{"segment_id":285,"unit":"Kiā","unit_norm":"kiā","ipa":"kiːɑːː","phonetic":"k-ee-ahh","vars":[],"eng_variants":[]},{"segment_id":284,"unit":"Kīa","unit_norm":"kīa","ipa":"kiːːɑ","phonetic":"k-eee-ah","vars":[],"eng_variants":[]},{"segment_id":283,"unit":"Kēū","unit_norm":"kēū","ipa":"kɛːuː","phonetic":"k-ehh-ooh","vars":[],"eng_variants":[]},{"segment_id":282,"unit":"Keū","unit_norm":"keū","ipa":"kɛhuː","phonetic":"k-eh-ooh","vars":[],"eng_variants":[]},{"segment_id":281,"unit":"Kēu","unit_norm":"kēu","ipa":"kɛːʊː","phonetic":"k-ehh-ew","vars":[],"eng_variants":[]},{"segment_id":280,"unit":"Kēō","unit_norm":"kēō","ipa":"kɛːɔːr","phonetic":"k-ehh-or","vars":[],"eng_variants":[]},{"segment_id":279,"unit":"Keō","unit_norm":"keō","ipa":"kɛhɔːr","phonetic":"k-eh-or","vars":[],"eng_variants":[]},{"segment_id":278,"unit":"Kēo","unit_norm":"kēo","ipa":"kɛːɔː","phonetic":"k-ehh-aw","vars":[],"eng_variants":[]},{"segment_id":277,"unit":"Kēī","unit_norm":"kēī","ipa":"kɛːiːː","phonetic":"k-ehh-eee","vars":[],"eng_variants":[]},{"segment_id":276,"unit":"Keī","unit_norm":"keī","ipa":"kɛhiːː","phonetic":"k-eh-eee","vars":[],"eng_variants":[]},{"segment_id":275,"unit":"Kēi","unit_norm":"kēi","ipa":"kɛːiː","phonetic":"k-ehh-ee","vars":[],"eng_variants":[]},{"segment_id":274,"unit":"Kēē","unit_norm":"kēē","ipa":"kɛːɛː","phonetic":"k-ehh-ehh","vars":[],"eng_variants":[]},{"segment_id":273,"unit":"Kēe","unit_norm":"kēe","ipa":"kɛːɛh","phonetic":"k-ehh-eh","vars":[],"eng_variants":[]},{"segment_id":272,"unit":"Kēā","unit_norm":"kēā","ipa":"kɛːɑːː","phonetic":"k-ehh-ahh","vars":[],"eng_variants":[]},{"segment_id":271,"unit":"Keā","unit_norm":"keā","ipa":"kɛhɑːː","phonetic":"k-eh-ahh","vars":[],"eng_variants":[]},{"segment_id":270,"unit":"Kēa","unit_norm":"kēa","ipa":"kɛːɑ","phonetic":"k-ehh-ah","vars":[],"eng_variants":[]},{"segment_id":269,"unit":"Kāū","unit_norm":"kāū","ipa":"kɑːːuː","phonetic":"k-ahh-ooh","vars":[],"eng_variants":[]},{"segment_id":268,"unit":"Kaū","unit_norm":"kaū","ipa":"kɑuː","phonetic":"k-ah-ooh","vars":[],"eng_variants":[]},{"segment_id":267,"unit":"Kāu","unit_norm":"kāu","ipa":"kɑːːʊː","phonetic":"k-ahh-ew","vars":[],"eng_variants":[]},{"segment_id":266,"unit":"Kāō","unit_norm":"kāō","ipa":"kɑːːɔːr","phonetic":"k-ahh-or","vars":[],"eng_variants":[]},{"segment_id":265,"unit":"Kaō","unit_norm":"kaō","ipa":"kɑɔːr","phonetic":"k-ah-or","vars":[],"eng_variants":[]},{"segment_id":264,"unit":"Kāo","unit_norm":"kāo","ipa":"kɑːːɔː","phonetic":"k-ahh-aw","vars":[],"eng_variants":[]},{"segment_id":263,"unit":"Kāī","unit_norm":"kāī","ipa":"kɑːːiːː","phonetic":"k-ahh-eee","vars":[],"eng_variants":[]},{"segment_id":262,"unit":"Kaī","unit_norm":"kaī","ipa":"kɑiːː","phonetic":"k-ah-eee","vars":[],"eng_variants":[]},{"segment_id":261,"unit":"Kāi","unit_norm":"kāi","ipa":"kɑːːiː","phonetic":"k-ahh-ee","vars":[],"eng_variants":[]},{"segment_id":260,"unit":"Kāē","unit_norm":"kāē","ipa":"kɑːːɛː","phonetic":"k-ahh-ehh","vars":[],"eng_variants":[]},{"segment_id":259,"unit":"Kāe","unit_norm":"kāe","ipa":"kɑːːɛh","phonetic":"k-ahh-eh","vars":[],"eng_variants":[]},{"segment_id":258,"unit":"Kāā","unit_norm":"kāā","ipa":"kɑːːɑːː","phonetic":"k-ahh-ahh","vars":[],"eng_variants":[]},{"segment_id":257,"unit":"Kaā","unit_norm":"kaā","ipa":"kɑɑːː","phonetic":"k-ah-ahh","vars":[],"eng_variants":[]},{"segment_id":256,"unit":"Kāa","unit_norm":"kāa","ipa":"kɑːːɑ","phonetic":"k-ahh-ah","vars":[],"eng_variants":[]},{"segment_id":255,"unit":"Kuu","unit_norm":"kuu","ipa":"kʊːʊː","phonetic":"k-ew-ew","vars":[],"eng_variants":[]},{"segment_id":254,"unit":"Kuo","unit_norm":"kuo","ipa":"kʊːɔː","phonetic":"k-ew-aw","vars":[],"eng_variants":[]},{"segment_id":253,"unit":"Kui","unit_norm":"kui","ipa":"kʊːiː","phonetic":"k-ew-ee","vars":[],"eng_variants":[]},{"segment_id":252,"unit":"Kue","unit_norm":"kue","ipa":"kʊːɛh","phonetic":"k-ew-eh","vars":[],"eng_variants":[]},{"segment_id":251,"unit":"Kua","unit_norm":"kua","ipa":"kʊːɑ","phonetic":"k-ew-ah","vars":[],"eng_variants":[]},{"segment_id":250,"unit":"Kou","unit_norm":"kou","ipa":"kɔːʊː","phonetic":"k-aw-ew","vars":[],"eng_variants":[]},{"segment_id":249,"unit":"Koo","unit_norm":"koo","ipa":"kɔːɔː","phonetic":"k-aw-aw","vars":[],"eng_variants":[]},{"segment_id":248,"unit":"Koi","unit_norm":"koi","ipa":"kɔːiː","phonetic":"k-aw-ee","vars":[],"eng_variants":[]},{"segment_id":247,"unit":"Koe","unit_norm":"koe","ipa":"kɔːɛh","phonetic":"k-aw-eh","vars":[],"eng_variants":[]},{"segment_id":246,"unit":"Koa","unit_norm":"koa","ipa":"kɔːɑ","phonetic":"k-aw-ah","vars":[],"eng_variants":[]},{"segment_id":245,"unit":"Kiu","unit_norm":"kiu","ipa":"kiːʊː","phonetic":"k-ee-ew","vars":[],"eng_variants":[]},{"segment_id":244,"unit":"Kio","unit_norm":"kio","ipa":"kiːɔː","phonetic":"k-ee-aw","vars":[],"eng_variants":[]},{"segment_id":243,"unit":"Kii","unit_norm":"kii","ipa":"kiːiː","phonetic":"k-ee-ee","vars":[],"eng_variants":[]},{"segment_id":242,"unit":"Kie","unit_norm":"kie","ipa":"kiːɛh","phonetic":"k-ee-eh","vars":[],"eng_variants":[]},{"segment_id":241,"unit":"Kia","unit_norm":"kia","ipa":"kiːɑ","phonetic":"k-ee-ah","vars":[],"eng_variants":[]},{"segment_id":240,"unit":"Keu","unit_norm":"keu","ipa":"kɛhʊː","phonetic":"k-eh-ew","vars":[],"eng_variants":[]},{"segment_id":239,"unit":"Keo","unit_norm":"keo","ipa":"kɛhɔː","phonetic":"k-eh-aw","vars":[],"eng_variants":[]},{"segment_id":238,"unit":"Kei","unit_norm":"kei","ipa":"kɛhiː","phonetic":"k-eh-ee","vars":[],"eng_variants":[]},{"segment_id":237,"unit":"Kee","unit_norm":"kee","ipa":"kɛhɛh","phonetic":"k-eh-eh","vars":[],"eng_variants":[]},{"segment_id":236,"unit":"Kea","unit_norm":"kea","ipa":"kɛhɑ","phonetic":"k-eh-ah","vars":[],"eng_variants":[]},{"segment_id":235,"unit":"Kau","unit_norm":"kau","ipa":"kɑʊː","phonetic":"k-ah-ew","vars":[],"eng_variants":[]},{"segment_id":234,"unit":"Kao","unit_norm":"kao","ipa":"kɑɔː","phonetic":"k-ah-aw","vars":[],"eng_variants":[]},{"segment_id":233,"unit":"Kai","unit_norm":"kai","ipa":"kɑiː","phonetic":"k-ah-ee","vars":[],"eng_variants":[]},{"segment_id":232,"unit":"Kae","unit_norm":"kae","ipa":"kɑɛh","phonetic":"k-ah-eh","vars":[],"eng_variants":[]},{"segment_id":231,"unit":"Kaa","unit_norm":"kaa","ipa":"kɑɑ","phonetic":"k-ah-ah","vars":[],"eng_variants":[]},{"segment_id":230,"unit":"Kū","unit_norm":"kū","ipa":"kuː","phonetic":"k-ooh","vars":[],"eng_variants":[]},{"segment_id":229,"unit":"Kō","unit_norm":"kō","ipa":"kɔːr","phonetic":"k-or","vars":[{"label":"v1","bracket":"(core)","just_part":"core"},{"label":"v2","bracket":"(ko)rey","just_part":"ko"},{"label":"v3","bracket":"(cour)t","just_part":"cour"},{"label":"v4","bracket":"(quar)t","just_part":"quar"},{"label":"v5","bracket":"(cor)se","just_part":"cor"}],"eng_variants":["(core)","(ko)rey","(cour)t","(quar)t","(cor)se"]},{"segment_id":228,"unit":"Kī","unit_norm":"kī","ipa":"kiːː","phonetic":"k-eee","vars":[{"label":"v1","bracket":"(ke)y","just_part":"ke"},{"label":"v2","bracket":"(kee)n","just_part":"kee"},{"label":"v3","bracket":"(kee)p","just_part":"kee"},{"label":"v4","bracket":"(qi)","just_part":"qi"}],"eng_variants":["(ke)y","(kee)n","(kee)p","(qi)"]},{"segment_id":227,"unit":"Kē","unit_norm":"kē","ipa":"kɛː","phonetic":"k-ehh","vars":[],"eng_variants":[]},{"segment_id":226,"unit":"Kā","unit_norm":"kā","ipa":"kɑːː","phonetic":"k-ahh","vars":[{"label":"v1","bracket":"(ka)rt","just_part":"ka"},{"label":"v2","bracket":"(ca)lm","just_part":"ca"},{"label":"v3","bracket":"(ca)r","just_part":"ca"},{"label":"v4","bracket":"(ca)rt","just_part":"ca"}],"eng_variants":["(ka)rt","(ca)lm","(ca)r","(ca)rt"]},{"segment_id":225,"unit":"Ku","unit_norm":"ku","ipa":"kʊː","phonetic":"k-ew","vars":[],"eng_variants":[]},{"segment_id":224,"unit":"Ko","unit_norm":"ko","ipa":"kɔː","phonetic":"k-aw","vars":[{"label":"v1","bracket":"(core)","just_part":"core"},{"label":"v2","bracket":"(ko)rey","just_part":"ko"},{"label":"v3","bracket":"(cour)t","just_part":"cour"},{"label":"v4","bracket":"(quar)t","just_part":"quar"},{"label":"v5","bracket":"(cor)se","just_part":"cor"}],"eng_variants":["(core)","(ko)rey","(cour)t","(quar)t","(cor)se"]},{"segment_id":223,"unit":"Ki","unit_norm":"ki","ipa":"kiː","phonetic":"k-ee","vars":[{"label":"v1","bracket":"(ke)y","just_part":"ke"},{"label":"v2","bracket":"(kee)n","just_part":"kee"},{"label":"v3","bracket":"(kee)p","just_part":"kee"},{"label":"v4","bracket":"(qi)","just_part":"qi"}],"eng_variants":["(ke)y","(kee)n","(kee)p","(qi)"]},{"segment_id":222,"unit":"Ke","unit_norm":"ke","ipa":"kɛh","phonetic":"k-eh","vars":[{"label":"base","bracket":"(ke)n","just_part":"Ke"}],"eng_variants":["(ke)n"]},{"segment_id":221,"unit":"Ka","unit_norm":"ka","ipa":"kɑ","phonetic":"k-ah","vars":[{"label":"v1","bracket":"(ka)rt","just_part":"ka"},{"label":"v2","bracket":"(ca)lm","just_part":"ca"},{"label":"v3","bracket":"(ca)r","just_part":"ca"},{"label":"v4","bracket":"(ca)rt","just_part":"ca"}],"eng_variants":["(ka)rt","(ca)lm","(ca)r","(ca)rt"]},{"segment_id":220,"unit":"Hūū","unit_norm":"hūū","ipa":"huːuː","phonetic":"h-ooh-ooh","vars":[],"eng_variants":[]},{"segment_id":219,"unit":"Huū","unit_norm":"huū","ipa":"hʊːuː","phonetic":"h-ew-ooh","vars":[],"eng_variants":[]},{"segment_id":218,"unit":"Hūu","unit_norm":"hūu","ipa":"huːʊː","phonetic":"h-ooh-ew","vars":[],"eng_variants":[]},{"segment_id":217,"unit":"Hūō","unit_norm":"hūō","ipa":"huːɔːr","phonetic":"h-ooh-or","vars":[],"eng_variants":[]},{"segment_id":216,"unit":"Haō","unit_norm":"haō","ipa":"hɑɔːr","phonetic":"h-ah-or","vars":[],"eng_variants":[]},{"segment_id":215,"unit":"Hūo","unit_norm":"hūo","ipa":"huːɔː","phonetic":"h-ooh-aw","vars":[],"eng_variants":[]},{"segment_id":214,"unit":"Hūī","unit_norm":"hūī","ipa":"huːiːː","phonetic":"h-ooh-eee","vars":[],"eng_variants":[]},{"segment_id":213,"unit":"Huī","unit_norm":"huī","ipa":"hʊːiːː","phonetic":"h-ew-eee","vars":[],"eng_variants":[]},{"segment_id":212,"unit":"Hūi","unit_norm":"hūi","ipa":"huːiː","phonetic":"h-ooh-ee","vars":[],"eng_variants":[]},{"segment_id":211,"unit":"Hūē","unit_norm":"hūē","ipa":"huːɛː","phonetic":"h-ooh-ehh","vars":[],"eng_variants":[]},{"segment_id":210,"unit":"Hūe","unit_norm":"hūe","ipa":"huːɛh","phonetic":"h-ooh-eh","vars":[],"eng_variants":[]},{"segment_id":209,"unit":"Hūā","unit_norm":"hūā","ipa":"huːɑːː","phonetic":"h-ooh-ahh","vars":[],"eng_variants":[]},{"segment_id":208,"unit":"Huā","unit_norm":"huā","ipa":"hʊːɑːː","phonetic":"h-ew-ahh","vars":[],"eng_variants":[]},{"segment_id":207,"unit":"Hūa","unit_norm":"hūa","ipa":"huːɑ","phonetic":"h-ooh-ah","vars":[],"eng_variants":[]},{"segment_id":206,"unit":"Hōū","unit_norm":"hōū","ipa":"hɔːruː","phonetic":"h-or-ooh","vars":[],"eng_variants":[]},{"segment_id":205,"unit":"Hoū","unit_norm":"hoū","ipa":"hɔːuː","phonetic":"h-aw-ooh","vars":[],"eng_variants":[]},{"segment_id":204,"unit":"Hōu","unit_norm":"hōu","ipa":"hɔːrʊː","phonetic":"h-or-ew","vars":[],"eng_variants":[]},{"segment_id":203,"unit":"Hōō","unit_norm":"hōō","ipa":"hɔːrɔːr","phonetic":"h-or-or","vars":[],"eng_variants":[]},{"segment_id":202,"unit":"Hoō","unit_norm":"hoō","ipa":"hɔːɔːr","phonetic":"h-aw-or","vars":[],"eng_variants":[]},{"segment_id":201,"unit":"Hōo","unit_norm":"hōo","ipa":"hɔːrɔː","phonetic":"h-or-aw","vars":[],"eng_variants":[]},{"segment_id":200,"unit":"Hōī","unit_norm":"hōī","ipa":"hɔːriːː","phonetic":"h-or-eee","vars":[],"eng_variants":[]},{"segment_id":199,"unit":"Hoī","unit_norm":"hoī","ipa":"hɔːiːː","phonetic":"h-aw-eee","vars":[],"eng_variants":[]},{"segment_id":198,"unit":"Hōi","unit_norm":"hōi","ipa":"hɔːriː","phonetic":"h-or-ee","vars":[],"eng_variants":[]},{"segment_id":197,"unit":"Hōē","unit_norm":"hōē","ipa":"hɔːrɛː","phonetic":"h-or-ehh","vars":[],"eng_variants":[]},{"segment_id":196,"unit":"Hōe","unit_norm":"hōe","ipa":"hɔːrɛh","phonetic":"h-or-eh","vars":[],"eng_variants":[]},{"segment_id":195,"unit":"Hōā","unit_norm":"hōā","ipa":"hɔːrɑːː","phonetic":"h-or-ahh","vars":[],"eng_variants":[]},{"segment_id":194,"unit":"Hoā","unit_norm":"hoā","ipa":"hɔːɑːː","phonetic":"h-aw-ahh","vars":[],"eng_variants":[]},{"segment_id":193,"unit":"Hōa","unit_norm":"hōa","ipa":"hɔːrɑ","phonetic":"h-or-ah","vars":[],"eng_variants":[]},{"segment_id":192,"unit":"Hīū","unit_norm":"hīū","ipa":"hiːːuː","phonetic":"h-eee-ooh","vars":[],"eng_variants":[]},{"segment_id":191,"unit":"Hiū","unit_norm":"hiū","ipa":"hiːuː","phonetic":"h-ee-ooh","vars":[],"eng_variants":[]},{"segment_id":190,"unit":"Hīu","unit_norm":"hīu","ipa":"hiːːʊː","phonetic":"h-eee-ew","vars":[],"eng_variants":[]},{"segment_id":189,"unit":"Hīō","unit_norm":"hīō","ipa":"hiːːɔːr","phonetic":"h-eee-or","vars":[],"eng_variants":[]},{"segment_id":188,"unit":"Hiō","unit_norm":"hiō","ipa":"hiːɔːr","phonetic":"h-ee-or","vars":[],"eng_variants":[]},{"segment_id":187,"unit":"Hīo","unit_norm":"hīo","ipa":"hiːːɔː","phonetic":"h-eee-aw","vars":[],"eng_variants":[]},{"segment_id":186,"unit":"Hīī","unit_norm":"hīī","ipa":"hiːːiːː","phonetic":"h-eee-eee","vars":[],"eng_variants":[]},{"segment_id":185,"unit":"Hiī","unit_norm":"hiī","ipa":"hiːiːː","phonetic":"h-ee-eee","vars":[],"eng_variants":[]},{"segment_id":184,"unit":"Hīi","unit_norm":"hīi","ipa":"hiːːiː","phonetic":"h-eee-ee","vars":[],"eng_variants":[]},{"segment_id":183,"unit":"Hīē","unit_norm":"hīē","ipa":"hiːːɛː","phonetic":"h-eee-ehh","vars":[],"eng_variants":[]},{"segment_id":182,"unit":"Hīe","unit_norm":"hīe","ipa":"hiːːɛh","phonetic":"h-eee-eh","vars":[],"eng_variants":[]},{"segment_id":181,"unit":"Hīā","unit_norm":"hīā","ipa":"hiːːɑːː","phonetic":"h-eee-ahh","vars":[],"eng_variants":[]},{"segment_id":180,"unit":"Hiā","unit_norm":"hiā","ipa":"hiːɑːː","phonetic":"h-ee-ahh","vars":[],"eng_variants":[]},{"segment_id":179,"unit":"Hīa","unit_norm":"hīa","ipa":"hiːːɑ","phonetic":"h-eee-ah","vars":[],"eng_variants":[]},{"segment_id":178,"unit":"Hēū","unit_norm":"hēū","ipa":"hɛːuː","phonetic":"h-ehh-ooh","vars":[],"eng_variants":[]},{"segment_id":177,"unit":"Heū","unit_norm":"heū","ipa":"hɛhuː","phonetic":"h-eh-ooh","vars":[],"eng_variants":[]},{"segment_id":176,"unit":"Hēu","unit_norm":"hēu","ipa":"hɛːʊː","phonetic":"h-ehh-ew","vars":[],"eng_variants":[]},{"segment_id":175,"unit":"Hēō","unit_norm":"hēō","ipa":"hɛːɔːr","phonetic":"h-ehh-or","vars":[],"eng_variants":[]},{"segment_id":174,"unit":"Heō","unit_norm":"heō","ipa":"hɛhɔːr","phonetic":"h-eh-or","vars":[],"eng_variants":[]},{"segment_id":173,"unit":"Hēo","unit_norm":"hēo","ipa":"hɛːɔː","phonetic":"h-ehh-aw","vars":[],"eng_variants":[]},{"segment_id":172,"unit":"Hēī","unit_norm":"hēī","ipa":"hɛːiːː","phonetic":"h-ehh-eee","vars":[],"eng_variants":[]},{"segment_id":171,"unit":"Heī","unit_norm":"heī","ipa":"hɛhiːː","phonetic":"h-eh-eee","vars":[],"eng_variants":[]},{"segment_id":170,"unit":"Hēi","unit_norm":"hēi","ipa":"hɛːiː","phonetic":"h-ehh-ee","vars":[],"eng_variants":[]},{"segment_id":169,"unit":"Hēē","unit_norm":"hēē","ipa":"hɛːɛː","phonetic":"h-ehh-ehh","vars":[],"eng_variants":[]},{"segment_id":168,"unit":"Hēe","unit_norm":"hēe","ipa":"hɛːɛh","phonetic":"h-ehh-eh","vars":[],"eng_variants":[]},{"segment_id":167,"unit":"Hēā","unit_norm":"hēā","ipa":"hɛːɑːː","phonetic":"h-ehh-ahh","vars":[],"eng_variants":[]},{"segment_id":166,"unit":"Heā","unit_norm":"heā","ipa":"hɛhɑːː","phonetic":"h-eh-ahh","vars":[],"eng_variants":[]},{"segment_id":165,"unit":"Hēa","unit_norm":"hēa","ipa":"hɛːɑ","phonetic":"h-ehh-ah","vars":[],"eng_variants":[]},{"segment_id":164,"unit":"Hāū","unit_norm":"hāū","ipa":"hɑːːuː","phonetic":"h-ahh-ooh","vars":[],"eng_variants":[]},{"segment_id":163,"unit":"Haū","unit_norm":"haū","ipa":"hɑuː","phonetic":"h-ah-ooh","vars":[],"eng_variants":[]},{"segment_id":162,"unit":"Hāu","unit_norm":"hāu","ipa":"hɑːːʊː","phonetic":"h-ahh-ew","vars":[],"eng_variants":[]},{"segment_id":161,"unit":"Hāō","unit_norm":"hāō","ipa":"hɑːːɔːr","phonetic":"h-ahh-or","vars":[],"eng_variants":[]},{"segment_id":160,"unit":"Haō","unit_norm":"haō","ipa":"hɑɔːr","phonetic":"h-ah-or","vars":[],"eng_variants":[]},{"segment_id":159,"unit":"Hāo","unit_norm":"hāo","ipa":"hɑːːɔː","phonetic":"h-ahh-aw","vars":[],"eng_variants":[]},{"segment_id":158,"unit":"Hāī","unit_norm":"hāī","ipa":"hɑːːiːː","phonetic":"h-ahh-eee","vars":[],"eng_variants":[]},{"segment_id":157,"unit":"Haī","unit_norm":"haī","ipa":"hɑiːː","phonetic":"h-ah-eee","vars":[],"eng_variants":[]},{"segment_id":156,"unit":"Hāi","unit_norm":"hāi","ipa":"hɑːːiː","phonetic":"h-ahh-ee","vars":[],"eng_variants":[]},{"segment_id":155,"unit":"Hāē","unit_norm":"hāē","ipa":"hɑːːɛː","phonetic":"h-ahh-ehh","vars":[],"eng_variants":[]},{"segment_id":154,"unit":"Hāe","unit_norm":"hāe","ipa":"hɑːːɛh","phonetic":"h-ahh-eh","vars":[],"eng_variants":[]},{"segment_id":153,"unit":"Hāā","unit_norm":"hāā","ipa":"hɑːːɑːː","phonetic":"h-ahh-ahh","vars":[],"eng_variants":[]},{"segment_id":152,"unit":"Haā","unit_norm":"haā","ipa":"hɑɑːː","phonetic":"h-ah-ahh","vars":[],"eng_variants":[]},{"segment_id":151,"unit":"Hāa","unit_norm":"hāa","ipa":"hɑːːɑ","phonetic":"h-ahh-ah","vars":[],"eng_variants":[]},{"segment_id":150,"unit":"Huu","unit_norm":"huu","ipa":"hʊːʊː","phonetic":"h-ew-ew","vars":[],"eng_variants":[]},{"segment_id":149,"unit":"Huo","unit_norm":"huo","ipa":"hʊːɔː","phonetic":"h-ew-aw","vars":[],"eng_variants":[]},{"segment_id":148,"unit":"Hui","unit_norm":"hui","ipa":"hʊːiː","phonetic":"h-ew-ee","vars":[],"eng_variants":[]},{"segment_id":147,"unit":"Hue","unit_norm":"hue","ipa":"hʊːɛh","phonetic":"h-ew-eh","vars":[],"eng_variants":[]},{"segment_id":146,"unit":"Hua","unit_norm":"hua","ipa":"hʊːɑ","phonetic":"h-ew-ah","vars":[],"eng_variants":[]},{"segment_id":145,"unit":"Hou","unit_norm":"hou","ipa":"hɔːʊː","phonetic":"h-aw-ew","vars":[],"eng_variants":[]},{"segment_id":144,"unit":"Hoo","unit_norm":"hoo","ipa":"hɔːɔː","phonetic":"h-aw-aw","vars":[],"eng_variants":[]},{"segment_id":143,"unit":"Hoi","unit_norm":"hoi","ipa":"hɔːiː","phonetic":"h-aw-ee","vars":[],"eng_variants":[]},{"segment_id":142,"unit":"Hoe","unit_norm":"hoe","ipa":"hɔːɛh","phonetic":"h-aw-eh","vars":[],"eng_variants":[]},{"segment_id":141,"unit":"Hoa","unit_norm":"hoa","ipa":"hɔːɑ","phonetic":"h-aw-ah","vars":[],"eng_variants":[]},{"segment_id":140,"unit":"Hiu","unit_norm":"hiu","ipa":"hiːʊː","phonetic":"h-ee-ew","vars":[],"eng_variants":[]},{"segment_id":139,"unit":"Hio","unit_norm":"hio","ipa":"hiːɔː","phonetic":"h-ee-aw","vars":[],"eng_variants":[]},{"segment_id":138,"unit":"Hii","unit_norm":"hii","ipa":"hiːiː","phonetic":"h-ee-ee","vars":[],"eng_variants":[]},{"segment_id":137,"unit":"Hie","unit_norm":"hie","ipa":"hiːɛh","phonetic":"h-ee-eh","vars":[],"eng_variants":[]},{"segment_id":136,"unit":"Hia","unit_norm":"hia","ipa":"hiːɑ","phonetic":"h-ee-ah","vars":[],"eng_variants":[]},{"segment_id":135,"unit":"Heu","unit_norm":"heu","ipa":"hɛhʊː","phonetic":"h-eh-ew","vars":[],"eng_variants":[]},{"segment_id":134,"unit":"Heo","unit_norm":"heo","ipa":"hɛhɔː","phonetic":"h-eh-aw","vars":[],"eng_variants":[]},{"segment_id":133,"unit":"Hei","unit_norm":"hei","ipa":"hɛhiː","phonetic":"h-eh-ee","vars":[],"eng_variants":[]},{"segment_id":132,"unit":"Hee","unit_norm":"hee","ipa":"hɛhɛh","phonetic":"h-eh-eh","vars":[],"eng_variants":[]},{"segment_id":131,"unit":"Hea","unit_norm":"hea","ipa":"hɛhɑ","phonetic":"h-eh-ah","vars":[],"eng_variants":[]},{"segment_id":130,"unit":"Hau","unit_norm":"hau","ipa":"hɑʊː","phonetic":"h-ah-ew","vars":[],"eng_variants":[]},{"segment_id":129,"unit":"Hao","unit_norm":"hao","ipa":"hɑɔː","phonetic":"h-ah-aw","vars":[],"eng_variants":[]},{"segment_id":128,"unit":"Hai","unit_norm":"hai","ipa":"hɑiː","phonetic":"h-ah-ee","vars":[],"eng_variants":[]},{"segment_id":127,"unit":"Hae","unit_norm":"hae","ipa":"hɑɛh","phonetic":"h-ah-eh","vars":[],"eng_variants":[]},{"segment_id":126,"unit":"Haa","unit_norm":"haa","ipa":"hɑɑ","phonetic":"h-ah-ah","vars":[],"eng_variants":[]},{"segment_id":125,"unit":"Hū","unit_norm":"hū","ipa":"huː","phonetic":"h-ooh","vars":[],"eng_variants":[]},{"segment_id":124,"unit":"Hō","unit_norm":"hō","ipa":"hɔːr","phonetic":"h-or","vars":[],"eng_variants":[]},{"segment_id":123,"unit":"Hī","unit_norm":"hī","ipa":"hiːː","phonetic":"h-eee","vars":[],"eng_variants":[]},{"segment_id":122,"unit":"Hē","unit_norm":"hē","ipa":"hɛː","phonetic":"h-ehh","vars":[],"eng_variants":[]},{"segment_id":121,"unit":"Hā","unit_norm":"hā","ipa":"hɑːː","phonetic":"h-ahh","vars":[],"eng_variants":[]},{"segment_id":120,"unit":"Hu","unit_norm":"hu","ipa":"hʊː","phonetic":"h-ew","vars":[],"eng_variants":[]},{"segment_id":119,"unit":"Ho","unit_norm":"ho","ipa":"hɔː","phonetic":"h-aw","vars":[],"eng_variants":[]},{"segment_id":118,"unit":"Hi","unit_norm":"hi","ipa":"hiː","phonetic":"h-ee","vars":[],"eng_variants":[]},{"segment_id":117,"unit":"He","unit_norm":"he","ipa":"hɛh","phonetic":"h-eh","vars":[],"eng_variants":[]},{"segment_id":116,"unit":"Ha","unit_norm":"ha","ipa":"hɑ","phonetic":"h-ah","vars":[],"eng_variants":[]},{"segment_id":115,"unit":"ūū","unit_norm":"ūū","ipa":"uːuː","phonetic":"ooh-ooh","vars":[],"eng_variants":[]},{"segment_id":114,"unit":"uū","unit_norm":"uū","ipa":"ʊːuː","phonetic":"ew-ooh","vars":[],"eng_variants":[]},{"segment_id":113,"unit":"ūu","unit_norm":"ūu","ipa":"uːʊː","phonetic":"ooh-ew","vars":[],"eng_variants":[]},{"segment_id":112,"unit":"ūō","unit_norm":"ūō","ipa":"uːɔːr","phonetic":"ooh-or","vars":[],"eng_variants":[]},{"segment_id":111,"unit":"aō","unit_norm":"aō","ipa":"ɑɔːr","phonetic":"ah-or","vars":[],"eng_variants":[]},{"segment_id":110,"unit":"ūo","unit_norm":"ūo","ipa":"uːɔː","phonetic":"ooh-aw","vars":[],"eng_variants":[]},{"segment_id":109,"unit":"ūī","unit_norm":"ūī","ipa":"uːiːː","phonetic":"ooh-eee","vars":[],"eng_variants":[]},{"segment_id":108,"unit":"uī","unit_norm":"uī","ipa":"ʊːiːː","phonetic":"ew-eee","vars":[],"eng_variants":[]},{"segment_id":107,"unit":"ūi","unit_norm":"ūi","ipa":"uːiː","phonetic":"ooh-ee","vars":[],"eng_variants":[]},{"segment_id":106,"unit":"ūē","unit_norm":"ūē","ipa":"uːɛː","phonetic":"ooh-ehh","vars":[],"eng_variants":[]},{"segment_id":105,"unit":"ūe","unit_norm":"ūe","ipa":"uːɛh","phonetic":"ooh-eh","vars":[],"eng_variants":[]},{"segment_id":104,"unit":"ūā","unit_norm":"ūā","ipa":"uːɑːː","phonetic":"ooh-ahh","vars":[],"eng_variants":[]},{"segment_id":103,"unit":"uā","unit_norm":"uā","ipa":"ʊːɑːː","phonetic":"ew-ahh","vars":[],"eng_variants":[]},{"segment_id":102,"unit":"ūa","unit_norm":"ūa","ipa":"uːɑ","phonetic":"ooh-ah","vars":[],"eng_variants":[]},{"segment_id":101,"unit":"ōū","unit_norm":"ōū","ipa":"ɔːruː","phonetic":"or-ooh","vars":[],"eng_variants":[]},{"segment_id":100,"unit":"oū","unit_norm":"oū","ipa":"ɔːuː","phonetic":"aw-ooh","vars":[],"eng_variants":[]},{"segment_id":99,"unit":"ōu","unit_norm":"ōu","ipa":"ɔːrʊː","phonetic":"or-ew","vars":[],"eng_variants":[]},{"segment_id":98,"unit":"ōō","unit_norm":"ōō","ipa":"ɔːrɔːr","phonetic":"or-or","vars":[],"eng_variants":[]},{"segment_id":97,"unit":"oō","unit_norm":"oō","ipa":"ɔːɔːr","phonetic":"aw-or","vars":[],"eng_variants":[]},{"segment_id":96,"unit":"ōo","unit_norm":"ōo","ipa":"ɔːrɔː","phonetic":"or-aw","vars":[],"eng_variants":[]},{"segment_id":95,"unit":"ōī","unit_norm":"ōī","ipa":"ɔːriːː","phonetic":"or-eee","vars":[],"eng_variants":[]},{"segment_id":94,"unit":"oī","unit_norm":"oī","ipa":"ɔːiːː","phonetic":"aw-eee","vars":[],"eng_variants":[]},{"segment_id":93,"unit":"ōi","unit_norm":"ōi","ipa":"ɔːriː","phonetic":"or-ee","vars":[],"eng_variants":[]},{"segment_id":92,"unit":"ōē","unit_norm":"ōē","ipa":"ɔːrɛː","phonetic":"or-ehh","vars":[],"eng_variants":[]},{"segment_id":91,"unit":"ōe","unit_norm":"ōe","ipa":"ɔːrɛh","phonetic":"or-eh","vars":[],"eng_variants":[]},{"segment_id":90,"unit":"ōā","unit_norm":"ōā","ipa":"ɔːrɑːː","phonetic":"or-ahh","vars":[],"eng_variants":[]},{"segment_id":89,"unit":"oā","unit_norm":"oā","ipa":"ɔːɑːː","phonetic":"aw-ahh","vars":[],"eng_variants":[]},{"segment_id":88,"unit":"ōa","unit_norm":"ōa","ipa":"ɔːrɑ","phonetic":"or-ah","vars":[],"eng_variants":[]},{"segment_id":87,"unit":"īū","unit_norm":"īū","ipa":"iːːuː","phonetic":"eee-ooh","vars":[],"eng_variants":[]},{"segment_id":86,"unit":"iū","unit_norm":"iū","ipa":"iːuː","phonetic":"ee-ooh","vars":[],"eng_variants":[]},{"segment_id":85,"unit":"īu","unit_norm":"īu","ipa":"iːːʊː","phonetic":"eee-ew","vars":[],"eng_variants":[]},{"segment_id":84,"unit":"īō","unit_norm":"īō","ipa":"iːːɔːr","phonetic":"eee-or","vars":[],"eng_variants":[]},{"segment_id":83,"unit":"iō","unit_norm":"iō","ipa":"iːɔːr","phonetic":"ee-or","vars":[],"eng_variants":[]},{"segment_id":82,"unit":"īo","unit_norm":"īo","ipa":"iːːɔː","phonetic":"eee-aw","vars":[],"eng_variants":[]},{"segment_id":81,"unit":"īī","unit_norm":"īī","ipa":"iːːiːː","phonetic":"eee-eee","vars":[],"eng_variants":[]},{"segment_id":80,"unit":"iī","unit_norm":"iī","ipa":"iːiːː","phonetic":"ee-eee","vars":[],"eng_variants":[]},{"segment_id":79,"unit":"īi","unit_norm":"īi","ipa":"iːːiː","phonetic":"eee-ee","vars":[],"eng_variants":[]},{"segment_id":78,"unit":"īē","unit_norm":"īē","ipa":"iːːɛː","phonetic":"eee-ehh","vars":[],"eng_variants":[]},{"segment_id":77,"unit":"īe","unit_norm":"īe","ipa":"iːːɛh","phonetic":"eee-eh","vars":[],"eng_variants":[]},{"segment_id":76,"unit":"īā","unit_norm":"īā","ipa":"iːːɑːː","phonetic":"eee-ahh","vars":[],"eng_variants":[]},{"segment_id":75,"unit":"iā","unit_norm":"iā","ipa":"iːɑːː","phonetic":"ee-ahh","vars":[],"eng_variants":[]},{"segment_id":74,"unit":"īa","unit_norm":"īa","ipa":"iːːɑ","phonetic":"eee-ah","vars":[],"eng_variants":[]},{"segment_id":73,"unit":"ēū","unit_norm":"ēū","ipa":"ɛːuː","phonetic":"ehh-ooh","vars":[],"eng_variants":[]},{"segment_id":72,"unit":"eū","unit_norm":"eū","ipa":"ɛhuː","phonetic":"eh-ooh","vars":[],"eng_variants":[]},{"segment_id":71,"unit":"ēu","unit_norm":"ēu","ipa":"ɛːʊː","phonetic":"ehh-ew","vars":[],"eng_variants":[]},{"segment_id":70,"unit":"ēō","unit_norm":"ēō","ipa":"ɛːɔːr","phonetic":"ehh-or","vars":[],"eng_variants":[]},{"segment_id":69,"unit":"eō","unit_norm":"eō","ipa":"ɛhɔːr","phonetic":"eh-or","vars":[],"eng_variants":[]},{"segment_id":68,"unit":"ēo","unit_norm":"ēo","ipa":"ɛːɔː","phonetic":"ehh-aw","vars":[],"eng_variants":[]},{"segment_id":67,"unit":"ēī","unit_norm":"ēī","ipa":"ɛːiːː","phonetic":"ehh-eee","vars":[],"eng_variants":[]},{"segment_id":66,"unit":"eī","unit_norm":"eī","ipa":"ɛhiːː","phonetic":"eh-eee","vars":[],"eng_variants":[]},{"segment_id":65,"unit":"ēi","unit_norm":"ēi","ipa":"ɛːiː","phonetic":"ehh-ee","vars":[],"eng_variants":[]},{"segment_id":64,"unit":"ēē","unit_norm":"ēē","ipa":"ɛːɛː","phonetic":"ehh-ehh","vars":[],"eng_variants":[]},{"segment_id":63,"unit":"ēe","unit_norm":"ēe","ipa":"ɛːɛh","phonetic":"ehh-eh","vars":[],"eng_variants":[]},{"segment_id":62,"unit":"ēā","unit_norm":"ēā","ipa":"ɛːɑːː","phonetic":"ehh-ahh","vars":[],"eng_variants":[]},{"segment_id":61,"unit":"eā","unit_norm":"eā","ipa":"ɛhɑːː","phonetic":"eh-ahh","vars":[],"eng_variants":[]},{"segment_id":60,"unit":"ēa","unit_norm":"ēa","ipa":"ɛːɑ","phonetic":"ehh-ah","vars":[],"eng_variants":[]},{"segment_id":59,"unit":"āū","unit_norm":"āū","ipa":"ɑːːuː","phonetic":"ahh-ooh","vars":[],"eng_variants":[]},{"segment_id":58,"unit":"aū","unit_norm":"aū","ipa":"ɑuː","phonetic":"ah-ooh","vars":[],"eng_variants":[]},{"segment_id":57,"unit":"āu","unit_norm":"āu","ipa":"ɑːːʊː","phonetic":"ahh-ew","vars":[],"eng_variants":[]},{"segment_id":56,"unit":"āō","unit_norm":"āō","ipa":"ɑːːɔːr","phonetic":"ahh-or","vars":[],"eng_variants":[]},{"segment_id":55,"unit":"aō","unit_norm":"aō","ipa":"ɑɔːr","phonetic":"ah-or","vars":[],"eng_variants":[]},{"segment_id":54,"unit":"āo","unit_norm":"āo","ipa":"ɑːːɔː","phonetic":"ahh-aw","vars":[],"eng_variants":[]},{"segment_id":53,"unit":"āī","unit_norm":"āī","ipa":"ɑːːiːː","phonetic":"ahh-eee","vars":[],"eng_variants":[]},{"segment_id":52,"unit":"aī","unit_norm":"aī","ipa":"ɑiːː","phonetic":"ah-eee","vars":[],"eng_variants":[]},{"segment_id":51,"unit":"āi","unit_norm":"āi","ipa":"ɑːːiː","phonetic":"ahh-ee","vars":[],"eng_variants":[]},{"segment_id":50,"unit":"āē","unit_norm":"āē","ipa":"ɑːːɛː","phonetic":"ahh-ehh","vars":[],"eng_variants":[]},{"segment_id":49,"unit":"āe","unit_norm":"āe","ipa":"ɑːːɛh","phonetic":"ahh-eh","vars":[],"eng_variants":[]},{"segment_id":48,"unit":"āā","unit_norm":"āā","ipa":"ɑːːɑːː","phonetic":"ahh-ahh","vars":[{"label":"v1","bracket":"t(ar)","just_part":"ar"},{"label":"v2","bracket":"c(ar)","just_part":"ar"},{"label":"v3","bracket":"f(ar)","just_part":"ar"},{"label":"v4","bracket":"fi(re)","just_part":"re"}],"eng_variants":["t(ar)","c(ar)","f(ar)","fi(re)"]},{"segment_id":47,"unit":"aā","unit_norm":"aā","ipa":"ɑɑːː","phonetic":"ah-ahh","vars":[{"label":"v1","bracket":"f(ar)","just_part":"ar"},{"label":"v2","bracket":"t(ar)","just_part":"ar"},{"label":"v3","bracket":"c(ar)","just_part":"ar"},{"label":"v4","bracket":"fi(re)","just_part":"re"}],"eng_variants":["f(ar)","t(ar)","c(ar)","fi(re)"]},{"segment_id":46,"unit":"āa","unit_norm":"āa","ipa":"ɑːːɑ","phonetic":"ahh-ah","vars":[{"label":"v1","bracket":"c(ar)","just_part":"ar"},{"label":"v2","bracket":"t(ar)","just_part":"ar"},{"label":"v3","bracket":"f(ar)","just_part":"ar"},{"label":"v4","bracket":"fi(re)","just_part":"re"}],"eng_variants":["c(ar)","t(ar)","f(ar)","fi(re)"]},{"segment_id":45,"unit":"uu","unit_norm":"uu","ipa":"ʊːʊː","phonetic":"ew-ew","vars":[{"label":"v1","bracket":"t(oo)","just_part":"oo"},{"label":"v2","bracket":"sh(oe)","just_part":"oe"}],"eng_variants":["t(oo)","sh(oe)"]},{"segment_id":44,"unit":"uo","unit_norm":"uo","ipa":"ʊːɔː","phonetic":"ew-aw","vars":[],"eng_variants":[]},{"segment_id":43,"unit":"ui","unit_norm":"ui","ipa":"ʊːiː","phonetic":"ew-ee","vars":[],"eng_variants":[]},{"segment_id":42,"unit":"ue","unit_norm":"ue","ipa":"ʊːɛh","phonetic":"ew-eh","vars":[],"eng_variants":[]},{"segment_id":41,"unit":"ua","unit_norm":"ua","ipa":"ʊːɑ","phonetic":"ew-ah","vars":[{"label":"v1","bracket":"t(our)","just_part":"our"}],"eng_variants":["t(our)"]},{"segment_id":40,"unit":"ou","unit_norm":"ou","ipa":"ɔːʊː","phonetic":"aw-ew","vars":[],"eng_variants":[]},{"segment_id":39,"unit":"oo","unit_norm":"oo","ipa":"ɔːɔː","phonetic":"aw-aw","vars":[],"eng_variants":[]},{"segment_id":38,"unit":"oi","unit_norm":"oi","ipa":"ɔːiː","phonetic":"aw-ee","vars":[{"label":"v1","bracket":"b(oy)","just_part":"oy"},{"label":"v2","bracket":"t(oy)","just_part":"oy"}],"eng_variants":["b(oy)","t(oy)"]},{"segment_id":37,"unit":"oe","unit_norm":"oe","ipa":"ɔːɛh","phonetic":"aw-eh","vars":[],"eng_variants":[]},{"segment_id":36,"unit":"oa","unit_norm":"oa","ipa":"ɔːɑ","phonetic":"aw-ah","vars":[{"label":"v1","bracket":"(oar)","just_part":"oar"}],"eng_variants":["(oar)"]},{"segment_id":35,"unit":"iu","unit_norm":"iu","ipa":"iːʊː","phonetic":"ee-ew","vars":[],"eng_variants":[]},{"segment_id":34,"unit":"io","unit_norm":"io","ipa":"iːɔː","phonetic":"ee-aw","vars":[{"label":"base","bracket":"pr(eor)dained","just_part":"eor"}],"eng_variants":["pr(eor)dained"]},{"segment_id":33,"unit":"ii","unit_norm":"ii","ipa":"iːiː","phonetic":"ee-ee","vars":[{"label":"v1","bracket":"k(ey)","just_part":"ey"},{"label":"v2","bracket":"m(e)","just_part":"e"}],"eng_variants":["k(ey)","m(e)"]},{"segment_id":32,"unit":"ie","unit_norm":"ie","ipa":"iːɛh","phonetic":"ee-eh","vars":[],"eng_variants":[]},{"segment_id":31,"unit":"ia","unit_norm":"ia","ipa":"iːɑ","phonetic":"ee-ah","vars":[{"label":"v1","bracket":"(ear)","just_part":"ear"},{"label":"v2","bracket":"(air)","just_part":"air"}],"eng_variants":["(ear)","(air)"]},{"segment_id":30,"unit":"eu","unit_norm":"eu","ipa":"ɛhʊː","phonetic":"eh-ew","vars":[],"eng_variants":[]},{"segment_id":29,"unit":"eo","unit_norm":"eo","ipa":"ɛhɔː","phonetic":"eh-aw","vars":[],"eng_variants":[]},{"segment_id":28,"unit":"ei","unit_norm":"ei","ipa":"ɛhiː","phonetic":"eh-ee","vars":[{"label":"v1","bracket":"k(ay)","just_part":"ay"},{"label":"v2","bracket":"d(ay)","just_part":"ay"},{"label":"v3","bracket":"m(ay)","just_part":"ay"},{"label":"v4","bracket":"tr(ay)","just_part":"ay"}],"eng_variants":["k(ay)","d(ay)","m(ay)","tr(ay)"]},{"segment_id":27,"unit":"ee","unit_norm":"ee","ipa":"ɛhɛh","phonetic":"eh-eh","vars":[{"label":"v1","bracket":"p(e)n","just_part":"e"},{"label":"v2","bracket":"k(e)n","just_part":"e"},{"label":"v3","bracket":"(e)gg","just_part":"e"}],"eng_variants":["p(e)n","k(e)n","(e)gg"]},{"segment_id":26,"unit":"ea","unit_norm":"ea","ipa":"ɛhɑ","phonetic":"eh-ah","vars":[{"label":"v1","bracket":"(ear)","just_part":"ear"},{"label":"v2","bracket":"(air)","just_part":"air"},{"label":"v3","bracket":"t(ear)","just_part":"ear"},{"label":"v4","bracket":"b(eer)","just_part":"eer"},{"label":"v5","bracket":"t(ier)","just_part":"ier"},{"label":"v6","bracket":"ch(air)","just_part":"air"}],"eng_variants":["(ear)","(air)","t(ear)","b(eer)","t(ier)","ch(air)"]},{"segment_id":25,"unit":"au","unit_norm":"au","ipa":"ɑʊː","phonetic":"ah-ew","vars":[{"label":"v1","bracket":"(oh)","just_part":"oh"}],"eng_variants":["(oh)"]},{"segment_id":24,"unit":"ao","unit_norm":"ao","ipa":"ɑɔː","phonetic":"ah-aw","vars":[],"eng_variants":[]},{"segment_id":23,"unit":"ai","unit_norm":"ai","ipa":"ɑiː","phonetic":"ah-ee","vars":[{"label":"v2","bracket":"(eye)","just_part":"eye"}],"eng_variants":["(eye)"]},{"segment_id":22,"unit":"ae","unit_norm":"ae","ipa":"ɑɛh","phonetic":"ah-eh","vars":[{"label":"v1","bracket":"(eye)","just_part":"eye"}],"eng_variants":["(eye)"]},{"segment_id":21,"unit":"aa","unit_norm":"aa","ipa":"ɑɑ","phonetic":"ah-ah","vars":[{"label":"v1","bracket":"c(ar)","just_part":"ar"},{"label":"v2","bracket":"c(ar)","just_part":"ar"}],"eng_variants":["c(ar)","c(ar)"]},{"segment_id":20,"unit":"ū","unit_norm":"ū","ipa":"uː","phonetic":"ooh","vars":[{"label":"v1","bracket":"sh(oe)","just_part":"oe"},{"label":"v2","bracket":"l(oo)","just_part":"oo"},{"label":"v3","bracket":"n(ew)","just_part":"ew"},{"label":"v4","bracket":"cr(ew)","just_part":"ew"},{"label":"v5","bracket":"tr(ue)","just_part":"ue"}],"eng_variants":["sh(oe)","l(oo)","n(ew)","cr(ew)","tr(ue)"]},{"segment_id":19,"unit":"ō","unit_norm":"ō","ipa":"ɔːr","phonetic":"or","vars":[{"label":"v1","bracket":"(oa)r","just_part":"oa"},{"label":"v2","bracket":"l(aw)","just_part":"aw"},{"label":"v3","bracket":"m(ore)","just_part":"ore"},{"label":"v4","bracket":"d(oo)r","just_part":"oo"}],"eng_variants":["(oa)r","l(aw)","m(ore)","d(oo)r"]},{"segment_id":18,"unit":"ī","unit_norm":"ī","ipa":"iːː","phonetic":"eee","vars":[{"label":"v1","bracket":"tr(ee)","just_part":"ee"},{"label":"v2","bracket":"m(e)","just_part":"e"},{"label":"v3","bracket":"kn(ee)","just_part":"ee"},{"label":"v4","bracket":"l(ee)","just_part":"ee"},{"label":"v5","bracket":"f(ee)","just_part":"ee"},{"label":"v6","bracket":"cr(ee)d","just_part":"ee"},{"label":"v7","bracket":"r(ea)d","just_part":"ea"},{"label":"v8","bracket":"d(ee)d","just_part":"ee"},{"label":"v9","bracket":"t(ee)","just_part":"ee"}],"eng_variants":["tr(ee)","m(e)","kn(ee)","l(ee)","f(ee)","cr(ee)d","r(ea)d","d(ee)d","t(ee)"]},{"segment_id":17,"unit":"ē","unit_norm":"ē","ipa":"ɛː","phonetic":"ehh","vars":[{"label":"v1","bracket":"p(e)n","just_part":"e"},{"label":"v2","bracket":"k(e)n","just_part":"e"},{"label":"v3","bracket":"(e)gg","just_part":"e"}],"eng_variants":["p(e)n","k(e)n","(e)gg"]},{"segment_id":16,"unit":"ā","unit_norm":"ā","ipa":"ɑːː","phonetic":"ahh","vars":[{"label":"v1","bracket":"b(ar)","just_part":"ar"},{"label":"v2","bracket":"c(ar)","just_part":"ar"},{"label":"v3","bracket":"f(ar)","just_part":"ar"}],"eng_variants":["b(ar)","c(ar)","f(ar)"]},{"segment_id":15,"unit":"u","unit_norm":"u","ipa":"ʊː","phonetic":"ew","vars":[{"label":"v1","bracket":"sh(oe)","just_part":"oe"},{"label":"v2","bracket":"l(oo)","just_part":"oo"},{"label":"v3","bracket":"n(ew)","just_part":"ew"},{"label":"v4","bracket":"cr(ew)","just_part":"ew"},{"label":"v5","bracket":"tr(ue)","just_part":"ue"}],"eng_variants":["sh(oe)","l(oo)","n(ew)","cr(ew)","tr(ue)"]},{"segment_id":14,"unit":"o","unit_norm":"o","ipa":"ɔː","phonetic":"aw","vars":[{"label":"v1","bracket":"(oa)r","just_part":"oa"},{"label":"v2","bracket":"l(aw)","just_part":"aw"},{"label":"v3","bracket":"m(ore)","just_part":"ore"},{"label":"v4","bracket":"d(oo)r","just_part":"oo"}],"eng_variants":["(oa)r","l(aw)","m(ore)","d(oo)r"]},{"segment_id":13,"unit":"i","unit_norm":"i","ipa":"iː","phonetic":"ee","vars":[{"label":"v1","bracket":"k(ey)","just_part":"ey"},{"label":"v2","bracket":"m(e)","just_part":"e"},{"label":"v3","bracket":"tr(ee)","just_part":"ee"}],"eng_variants":["k(ey)","m(e)","tr(ee)"]},{"segment_id":12,"unit":"e","unit_norm":"e","ipa":"ɛh","phonetic":"eh","vars":[{"label":"v1","bracket":"p(e)n","just_part":"e"},{"label":"v2","bracket":"k(e)n","just_part":"e"},{"label":"v3","bracket":"(e)gg","just_part":"e"}],"eng_variants":["p(e)n","k(e)n","(e)gg"]},{"segment_id":11,"unit":"a","unit_norm":"a","ipa":"ɑ","phonetic":"ah","vars":[{"label":"v1","bracket":"c(ar)","just_part":"ar"},{"label":"v2","bracket":"f(ar)","just_part":"ar"},{"label":"v3","bracket":"b(ar)","just_part":"ar"}],"eng_variants":["c(ar)","f(ar)","b(ar)"]},{"segment_id":10,"unit":"wh","unit_norm":"wh","ipa":"f","phonetic":"whf","vars":[{"label":"v1","bracket":"(f)ar","just_part":"f"},{"label":"v2","bracket":"(f)ear","just_part":"f"},{"label":"v3","bracket":"(f)ur","just_part":"f"},{"label":"v4","bracket":"(f)ee","just_part":"f"},{"label":"v5","bracket":"(f)or","just_part":"f"},{"label":"v6","bracket":"(f)ood","just_part":"f"}],"eng_variants":["(f)ar","(f)ear","(f)ur","(f)ee","(f)or","(f)ood"]},{"segment_id":9,"unit":"ng","unit_norm":"ng","ipa":"ŋˤŋ","phonetic":"ngngih","vars":[{"label":"v1","bracket":"hu(ng)","just_part":"ng"},{"label":"v2","bracket":"you(ng)","just_part":"ng"},{"label":"v3","bracket":"fu(n)k","just_part":"n"},{"label":"v4","bracket":"ba(ng)","just_part":"ng"},{"label":"v5","bracket":"si(n)k","just_part":"n"},{"label":"v6","bracket":"flu(ng)","just_part":"ng"}],"eng_variants":["hu(ng)","you(ng)","fu(n)k","ba(ng)","si(n)k","flu(ng)"]},{"segment_id":8,"unit":"w","unit_norm":"w","ipa":"w","phonetic":"wf","vars":[{"label":"v1","bracket":"(w)ar","just_part":"w"},{"label":"v2","bracket":"(w)ore","just_part":"w"},{"label":"v3","bracket":"(w)hy","just_part":"w"},{"label":"v4","bracket":"(w)annabe","just_part":"w"},{"label":"v5","bracket":"(w)oo","just_part":"w"},{"label":"v6","bracket":"(w)et","just_part":"w"},{"label":"v7","bracket":"(w)e","just_part":"w"}],"eng_variants":["(w)ar","(w)ore","(w)hy","(w)annabe","(w)oo","(w)et","(w)e"]},{"segment_id":7,"unit":"t","unit_norm":"t","ipa":"t","phonetic":"tt","vars":[{"label":"v1","bracket":"(t)ar","just_part":"t"},{"label":"v2","bracket":"(t)en","just_part":"t"},{"label":"v3","bracket":"(t)ea","just_part":"t"},{"label":"v4","bracket":"(t)ore","just_part":"t"},{"label":"v5","bracket":"(t)oo","just_part":"t"}],"eng_variants":["(t)ar","(t)en","(t)ea","(t)ore","(t)oo"]},{"segment_id":6,"unit":"r","unit_norm":"r","ipa":".ɾ͡d","phonetic":"rr","vars":[{"label":"v1","bracket":"(r)un","just_part":"r"},{"label":"v2","bracket":"(r)ed","just_part":"r"},{"label":"v3","bracket":"(r)ead","just_part":"r"},{"label":"v4","bracket":"(r)aw","just_part":"r"},{"label":"v5","bracket":"(r)oot","just_part":"r"}],"eng_variants":["(r)un","(r)ed","(r)ead","(r)aw","(r)oot"]},{"segment_id":5,"unit":"p","unit_norm":"p","ipa":"p","phonetic":"pp","vars":[{"label":"v1","bracket":"(p)art","just_part":"p"},{"label":"v2","bracket":"(p)en","just_part":"p"},{"label":"v3","bracket":"(p)eat","just_part":"p"},{"label":"v4","bracket":"(p)oor","just_part":"p"},{"label":"v5","bracket":"(p)oo","just_part":"p"}],"eng_variants":["(p)art","(p)en","(p)eat","(p)oor","(p)oo"]},{"segment_id":4,"unit":"n","unit_norm":"n","ipa":"n","phonetic":"nn","vars":[{"label":"v1","bracket":"(n)ark","just_part":"n"},{"label":"v2","bracket":"(n)ed","just_part":"n"},{"label":"v3","bracket":"(n)eed","just_part":"n"},{"label":"v4","bracket":"(n)ew","just_part":"n"},{"label":"v5","bracket":"(n)ord","just_part":"n"}],"eng_variants":["(n)ark","(n)ed","(n)eed","(n)ew","(n)ord"]},{"segment_id":3,"unit":"m","unit_norm":"m","ipa":"m","phonetic":"mm","vars":[{"label":"v1","bracket":"(m)art","just_part":"m"},{"label":"v2","bracket":"(m)en","just_part":"m"},{"label":"v3","bracket":"(m)ore","just_part":"m"},{"label":"v4","bracket":"(m)ove","just_part":"m"},{"label":"v5","bracket":"(m)e","just_part":"m"},{"label":"v6","bracket":"(m)eek","just_part":"m"}],"eng_variants":["(m)art","(m)en","(m)ore","(m)ove","(m)e","(m)eek"]},{"segment_id":2,"unit":"k","unit_norm":"k","ipa":"k","phonetic":"kk","vars":[{"label":"v1","bracket":"(k)een","just_part":"k"},{"label":"v2","bracket":"(k)erry","just_part":"k"},{"label":"v3","bracket":"(k)ept","just_part":"k"},{"label":"v4","bracket":"(k)en","just_part":"k"},{"label":"v5","bracket":"(k)ey","just_part":"k"},{"label":"v6","bracket":"(k)elp","just_part":"k"},{"label":"v7","bracket":"(k)art","just_part":"k"}],"eng_variants":["(k)een","(k)erry","(k)ept","(k)en","(k)ey","(k)elp","(k)art"]},{"segment_id":1,"unit":"h","unit_norm":"h","ipa":"h","phonetic":"hh","vars":[{"label":"v2","bracket":"(h)ard","just_part":"h"},{"label":"v3","bracket":"(h)arp","just_part":"h"},{"label":"v4","bracket":"(h)en","just_part":"h"},{"label":"v5","bracket":"(h)ead","just_part":"h"},{"label":"v6","bracket":"(h)e","just_part":"h"},{"label":"v7","bracket":"(h)eat","just_part":"h"},{"label":"v8","bracket":"(h)awk","just_part":"h"},{"label":"v9","bracket":"(h)oard","just_part":"h"},{"label":"v10","bracket":"(h)oot","just_part":"h"},{"label":"v11","bracket":"(h)oop","just_part":"h"}],"eng_variants":["(h)ard","(h)arp","(h)en","(h)ead","(h)e","(h)eat","(h)awk","(h)oard","(h)oot","(h)oop"]}];
  function getV4LexiconMatches(unit){
    const key = String(unit||'').trim().toLowerCase();
    return getRichLexiconIndex().get(key) || [];
  }

  function chooseDefaultMatchV4(matches){
    if(!matches || !matches.length) return null;
    return matches[0];
  }

  function loadG2pV4LexiconPrefs(){
    const parsed = safeJsonParse(localStorage.getItem(STORAGE_KEYS.g2pV4LexiconPrefs) || '{}');
    if(parsed.ok && parsed.value && typeof parsed.value === 'object') return parsed.value;
    return {};
  }

  function saveG2pV4LexiconPrefs(prefs){
    localStorage.setItem(STORAGE_KEYS.g2pV4LexiconPrefs, JSON.stringify(prefs || {}));
  }

  function loadG2pV4LexiconHistory(){
    const parsed = safeJsonParse(localStorage.getItem(STORAGE_KEYS.g2pV4LexiconHistory) || '[]');
    if(parsed.ok && Array.isArray(parsed.value)) return parsed.value;
    return [];
  }

  function saveG2pV4LexiconHistory(items){
    localStorage.setItem(STORAGE_KEYS.g2pV4LexiconHistory, JSON.stringify(items || []));
  }

  function addG2pV4LexiconHistoryEntry(entry){
    const items = loadG2pV4LexiconHistory();
    items.unshift(entry);
    try {
      saveG2pV4LexiconHistory(items.slice(0, 200));
    } catch (e) {
      // keep UI alive if storage is full
      alert('Browser storage quota reached. Export history and clear older entries before logging more.');
    }
  }

  function joinPartsPlus(parts){
    return (parts || []).map(x => String(x || '')).join(' + ');
  }

  function buildIpaSsml(word, ipa){
    const w = String(word || '');
    const ph = String(ipa || '');
    if(!ph) return '';
    // AWS Polly SSML IPA tag
    return '<phoneme alphabet="ipa" ph="' + ph + '">' + w + '</phoneme>';
  }

  function stripLowerArticulationFromIpa(ipa){
    return String(ipa || '').replace(/[\u031E\u02D5]/g, '');
  }

  function computeG2pV4Word(word, opts={}){
    const original = String(word || '');
    const wordNorm = normalizeWord(original);
    const trace = !!opts.trace;
    const joinMode = opts.joinMode || 'space';

    const res = segmentWordCore(wordNorm, { trace });
    const segs = res.segments || [];

    const rows = [];
    const ipaParts = [];
    const phoneticParts = [];
    const engIdxs = [];

    for(const seg of segs){
      const matches = getV4LexiconMatches(seg);
      const chosen = chooseDefaultMatchV4(matches);
      const ipa = chosen ? (chosen.ipa || '') : '';
      if(ipa) ipaParts.push(ipa);

      const phon = chosen ? (chosen.phonetic || '') : '';
      phoneticParts.push(phon || '(N/A)');

      const variants = chosen ? (chosen.eng_variants || []) : [];
      engIdxs.push(0);

      rows.push({
        segment: seg,
        chosenId: chosen ? (chosen.segment_id ?? null) : null,
        chosenUnit: chosen ? (chosen.unit || '') : '',
        chosenIpa: ipa,
        chosenPhonetic: phon,
        variants,
        vars: chosen ? (chosen.vars || []) : [],
        status: chosen ? 'match' : 'missing'
      });
    }

    const ipaJoined = joinIpa(ipaParts, joinMode);
    const ssml = buildIpaSsml(original || wordNorm, ipaJoined);

    return {
      word: original,
      wordNorm,
      segments: segs,
      rows,
      ipaParts,
      ipa: ipaJoined,
      ssml,
      phoneticParts,
      engIdxs,
      ruleIds: res.ruleIds || [],
      trace: res.trace || []
    };
  }

  function computeEnglishAssistPartsForWord(wordObj){
    const parts = [];
    const rows = wordObj.rows || [];
    for(let i=0;i<rows.length;i++) {
      const r = rows[i];
      const vars = r.variants || [];
      if(!vars.length) {
        parts.push('(N/A)');
        continue;
      }
      const idx = (wordObj.engIdxs && typeof wordObj.engIdxs[i] === 'number') ? wordObj.engIdxs[i] : 0;
      parts.push(vars[idx % vars.length] || '(N/A)');
    }
    return parts;
  }

  function renderG2PV4Lexicon(){
    const root = document.getElementById('pageG2PV4Lexicon');
    root.innerHTML = '';

    const prefs = loadG2pV4LexiconPrefs();
    if(!prefs.joinMode) prefs.joinMode = 'space';
    if(typeof prefs.renderLimit !== 'number') prefs.renderLimit = 60;

    let lastAnalysis = null; // in-memory
    let renderedCount = 0;

    const card = el('div', {class:'card'});
    card.appendChild(el('h2', {}, ['G2P V4 Lexicon']));
    card.appendChild(el('p', {}, [
      'Clone of the G2P tab using the selected rich lexicon fields (V4 or V5, with segment_id, unit, proper_ipa and variation assists). ',
      'Paste a word or text block, then generate IPA SSML, combination amo manual, and English assist.'
    ]));
    const richLexiconControl = buildLexiconSourceControl('rich', ()=>{ renderG2PV4Lexicon(); }, 'Rich lexicon source');

    const input = el('textarea', {rows: 5, placeholder:'Paste a word or a block of text...'});
    input.style.width = '100%';
    input.value = prefs.lastInputText || '';
    input.addEventListener('input', ()=>{
      prefs.lastInputText = input.value;
      saveG2pV4LexiconPrefs(prefs);
    });

    const traceCheck = el('label', {class:'checkbox'});
    const traceInput = el('input', {type:'checkbox'});
    traceInput.checked = false;
    traceCheck.appendChild(traceInput);
    traceCheck.appendChild(document.createTextNode('Include Trace'));

    const joinSelect = el('select', {class:'btn', title:'IPA join style'});
    joinSelect.style.padding = '8px 10px';
    joinSelect.style.borderRadius = '10px';
    joinSelect.style.background = 'var(--surfaceStrong)';
    joinSelect.style.border = '1px solid var(--border)';
    joinSelect.style.color = 'var(--text)';

    const joinOptions = [
      {v:'space', t:'IPA Join: space'},
      {v:'dot', t:'IPA Join: dot'},
      {v:'none', t:'IPA Join: none'}
    ];
    for(const opt of joinOptions){
      const o = el('option', {value: opt.v}, [opt.t]);
      if(opt.v === (prefs.joinMode || 'space')) o.selected = true;
      joinSelect.appendChild(o);
    }

    const renderLimitInput = el('input', {type:'number', min:'1', step:'1', value: String(prefs.renderLimit || 60), style:'width:110px;'});
    const renderLimitLabel = el('label', {class:'checkbox'});
    renderLimitLabel.appendChild(el('span', {class:'muted'}, ['Render First']));
    renderLimitLabel.appendChild(renderLimitInput);
    renderLimitLabel.appendChild(el('span', {class:'muted'}, ['Words']));

    const runBtn = el('button', {class:'btn primary', type:'button'}, ['Analyze']);
    const btnClear = el('button', {class:'btn', type:'button'}, ['Clear']);
    const btnDownload = el('button', {class:'btn', type:'button'}, ['Download Analysis JSON']);
    const btnLoad = el('button', {class:'btn', type:'button'}, ['Load Analysis JSON']);
    const fileLoad = el('input', {type:'file', accept:'application/json', class:'hidden'});

    btnLoad.addEventListener('click', ()=> fileLoad.click());

    const infoRow = el('div', {class:'row'});
    infoRow.appendChild(runBtn);
    infoRow.appendChild(btnClear);
    infoRow.appendChild(joinSelect);
    infoRow.appendChild(traceCheck);
    infoRow.appendChild(richLexiconControl.wrap);
    infoRow.appendChild(renderLimitLabel);
    infoRow.appendChild(btnDownload);
    infoRow.appendChild(btnLoad);
    infoRow.appendChild(fileLoad);

    card.appendChild(input);
    card.appendChild(el('div', {style:'margin-top:10px;'}));
    card.appendChild(infoRow);

    const outWrap = el('div', {class:'stack', style:'margin-top:12px;'});

    root.appendChild(card);
    root.appendChild(outWrap);

    function renderSummary(summary){
      const row = el('div', {class:'row'});
      row.appendChild(el('span', {class:'tag'}, ['words: ' + summary.wordCount]));
      row.appendChild(el('span', {class:'tag'}, ['rendered: ' + summary.rendered]));
      row.appendChild(el('span', {class:'tag'}, ['segments: ' + summary.segmentCount]));
      row.appendChild(el('span', {class:'tag'}, ['missing segments: ' + summary.missingSegmentCount]));
      row.appendChild(el('span', {class:'tag'}, ['unique segments used: ' + summary.uniqueSegmentCount]));
      return row;
    }

    function tokenizePublicDemoTextPreserve(text, splitHyphen){
      const t = String(text || '');
      const wordRe = splitHyphen ? /[A-Za-zĀāĒēĪīŌōŪū]+/g : /[A-Za-zĀāĒēĪīŌōŪū\-]+/g;
      const tokens = [];
      let last = 0;
      for(const m of t.matchAll(wordRe)){
        const i = m.index || 0;
        if(i > last) tokens.push({type:'sep', text: t.slice(last, i)});
        tokens.push({type:'word', text: m[0]});
        last = i + m[0].length;
      }
      if(last < t.length) tokens.push({type:'sep', text: t.slice(last)});
      return tokens;
    }

    function buildWordCard(wordObj, wordIndex){
      const card = el('div', {class:'card'});
      const segs = wordObj.segments || [];
      const rows = wordObj.rows || [];
      const missing = rows.filter(r => r.status === 'missing').length;

      const headerRow = el('div', {class:'row'});
      headerRow.appendChild(el('span', {class:'tag'}, ['word: ' + (wordObj.word || wordObj.wordNorm || '')]));
      headerRow.appendChild(el('span', {class:'tag'}, ['segments: ' + segs.length]));
      if(missing) headerRow.appendChild(el('span', {class:'tag bad'}, ['missing: ' + missing]));
      card.appendChild(headerRow);

      const englishAssistParts = computeEnglishAssistPartsForWord(wordObj);
      const phoneticParts = (wordObj.phoneticParts || []).map(x => String(x || '(N/A)'));
      const segmentsLine = joinPartsPlus(segs);
      const phoneticLine = joinPartsPlus(phoneticParts);
      const englishAssistLine = joinPartsPlus(englishAssistParts);

      const ssml = wordObj.ssml || '';
      const ipa = wordObj.ipa || '';

      const block = el('div', {class:'twoCol', style:'margin-top:10px;'});
      const left = el('div');
      const right = el('div');

      function labeled(label, value, id){
        const wrap = el('div', {style:'margin-bottom:10px;'});
        wrap.appendChild(el('div', {class:'muted'}, [label]));
        const pre = el('pre', {class:'mono'});
        if(id) pre.id = id;
        pre.textContent = value || '';
        wrap.appendChild(pre);
        return wrap;
      }

      left.appendChild(labeled('Word', String(wordObj.word || '')));
      left.appendChild(labeled('Segments', segmentsLine));
      left.appendChild(labeled('Combination amo manual', phoneticLine, 'g2pv4Phonetic_' + wordIndex));
      right.appendChild(labeled('IPA', ipa, 'g2pv4Ipa_' + wordIndex));
      right.appendChild(labeled('IPA SSML Output', ssml, 'g2pv4Ssml_' + wordIndex));
      right.appendChild(labeled('English Assist', englishAssistLine, 'g2pv4Eng_' + wordIndex));

      block.appendChild(left);
      block.appendChild(right);
      card.appendChild(block);

      const btnRow = el('div', {class:'row'});
      const btnCopySsml = el('button', {class:'btn', type:'button'}, ['Copy SSML']);
      const btnCopyEng = el('button', {class:'btn', type:'button'}, ['Copy English Assist']);
      const btnRegen = el('button', {class:'btn', type:'button'}, ['Regenerate English Assist']);
      btnRow.appendChild(btnCopySsml);
      btnRow.appendChild(btnCopyEng);
      btnRow.appendChild(btnRegen);
      card.appendChild(btnRow);

      btnCopySsml.addEventListener('click', ()=> copyToClipboard(ssml || ''));
      btnCopyEng.addEventListener('click', ()=> {
        const line = joinPartsPlus(computeEnglishAssistPartsForWord(wordObj));
        copyToClipboard(line);
      });

      const detail = el('div', {style:'margin-top:12px;'});
      card.appendChild(detail);

      function redrawEnglish(){
        const engParts = computeEnglishAssistPartsForWord(wordObj);
        const engLine = joinPartsPlus(engParts);
        const engPre = card.querySelector('#g2pv4Eng_' + wordIndex);
        if(engPre) engPre.textContent = engLine;

        // update table column values
        const tds = card.querySelectorAll('td[data-eng-idx]');
        for(const td of tds){
          const idx = Number(td.getAttribute('data-eng-idx'));
          const r = rows[idx];
          const vars = (r && r.variants) ? r.variants : [];
          if(!vars.length) td.textContent = '(N/A)';
          else {
            const i = (wordObj.engIdxs && typeof wordObj.engIdxs[idx] === 'number') ? wordObj.engIdxs[idx] : 0;
            td.textContent = vars[i % vars.length] || '(N/A)';
          }
        }
      }

      btnRegen.addEventListener('click', ()=>{
        // cycle each segment that has variants
        for(let i=0;i<rows.length;i++) {
          const r = rows[i];
          const vars = r.variants || [];
          if(vars.length) wordObj.engIdxs[i] = (wordObj.engIdxs[i] || 0) + 1;
        }
        redrawEnglish();
      });

      // Mapping table
      const tbl = el('table');
      const thead = el('thead');
      thead.appendChild(el('tr', {}, [
        el('th', {}, ['Segment']),
        el('th', {}, ['Status']),
        el('th', {}, ['ID']),
        el('th', {}, ['Unit']),
        el('th', {}, ['Proper IPA']),
        el('th', {}, ['Phonetic']),
        el('th', {}, ['English Assist']),
        el('th', {}, ['Variants'])
      ]));
      tbl.appendChild(thead);
      const tbody = el('tbody');

      function showSegmentDetail(segIndex){
        detail.innerHTML = '';
        const r = rows[segIndex];
        if(!r) return;

      const d = el('div', {class:'card', style:'background:var(--surfaceTable);'});
        d.appendChild(el('h3', {}, ['Segment Detail']));
        d.appendChild(el('p', {class:'muted'}, ['Unit: ' + (r.chosenUnit || r.segment || '') + '   ID: ' + (r.chosenId == null ? '' : String(r.chosenId)) ]));

        const variants = r.vars || [];
        if(!variants.length){
          d.appendChild(el('p', {class:'muted'}, ['No variations found for this segment in V4.']));
          detail.appendChild(d);
          return;
        }

        const t = el('table');
        const th = el('thead');
        th.appendChild(el('tr', {}, [
          el('th', {}, ['Version']),
          el('th', {}, ['Full Word Bracket Assist']),
          el('th', {}, ['Just Part']),
          el('th', {}, ['Use'])
        ]));
        t.appendChild(th);
        const tb = el('tbody');

        // map bracket value to index in eng variants
        const engVars = r.variants || [];
        for(const v of variants){
          const br = v.bracket || '';
          const jp = v.just_part || '';
          const tr = el('tr');
          tr.appendChild(el('td', {class:'mono'}, [v.label || '']));
          tr.appendChild(el('td', {class:'mono'}, [br || '']));
          tr.appendChild(el('td', {class:'mono'}, [jp || '']));
          const btnCell = el('td');
          if(br && engVars.length){
            const useBtn = el('button', {class:'btn', type:'button'}, ['Use']);
            useBtn.addEventListener('click', ()=>{
              const ix = engVars.indexOf(br);
              if(ix >= 0) wordObj.engIdxs[segIndex] = ix;
              redrawEnglish();
            });
            btnCell.appendChild(useBtn);
          } else {
            btnCell.appendChild(el('span', {class:'muted'}, ['(N/A)']));
          }
          tr.appendChild(btnCell);
          tb.appendChild(tr);
        }
        t.appendChild(tb);
        d.appendChild(t);
        detail.appendChild(d);
      }

      for(let i=0;i<rows.length;i++) {
        const r = rows[i];
        const tr = el('tr');
        tr.style.cursor = 'pointer';
        tr.addEventListener('click', ()=> showSegmentDetail(i));

        const statusTag = r.status === 'match' ? 'good' : 'bad';

        tr.appendChild(el('td', {class:'mono'}, [r.segment]));
        tr.appendChild(el('td', {}, [el('span', {class:'tag ' + statusTag}, [r.status])]));
        tr.appendChild(el('td', {class:'mono'}, [r.chosenId == null ? '' : String(r.chosenId)]));
        tr.appendChild(el('td', {class:'mono'}, [r.chosenUnit || '']));
        tr.appendChild(el('td', {class:'mono'}, [r.chosenIpa || '']));
        tr.appendChild(el('td', {class:'mono'}, [r.chosenPhonetic || '']));
        const engTd = el('td', {class:'mono'}, ['']);
        engTd.setAttribute('data-eng-idx', String(i));
        tr.appendChild(engTd);
        tr.appendChild(el('td', {class:'mono'}, [String((r.variants || []).length)]));
        tbody.appendChild(tr);
      }
      tbl.appendChild(tbody);
      card.appendChild(el('h3', {style:'margin-top:12px;'}, ['Segment Mapping']));
      card.appendChild(tbl);

      redrawEnglish();
      return card;
    }

    function renderAnalysis(analysis){
      outWrap.innerHTML = '';
      if(!analysis) return;

      const summaryCard = el('div', {class:'card'});
      summaryCard.appendChild(el('h2', {}, ['Analysis Summary']));
      summaryCard.appendChild(renderSummary(analysis.summary));
      summaryCard.appendChild(el('p', {class:'muted'}, [
        'Only the first ' + analysis.summary.rendered + ' words are rendered as cards to keep the browser responsive. ',
        'Use "Render First" to change this limit, or download the analysis JSON for full results.'
      ]));
      outWrap.appendChild(summaryCard);

      const words = analysis.words || [];
      for(let i=0;i<analysis.summary.rendered;i++) {
        outWrap.appendChild(buildWordCard(words[i], i));
      }
    }

    async function runAnalysisFromText(rawText){
      const parts = tokenizeTextBlockParts(rawText);
      const wordsRaw = [];
      for(const p of parts){
        if(p.type === 'word') wordsRaw.push(p.raw);
      }
      const wordCount = wordsRaw.length;

      const limit = Math.max(1, Number(renderLimitInput.value || prefs.renderLimit || 60));
      prefs.renderLimit = limit;
      saveG2pV4LexiconPrefs(prefs);

      const words = [];
      let segmentCount = 0;
      let missingSegmentCount = 0;
      const uniqueSegs = new Set();
    const usageMap = new Map();
    const bracketSegs = new Set();
    let bracketSegOccurrences = 0;

      const chunkSize = 25;
      for(let i=0;i<wordsRaw.length;i++) {
        const w = wordsRaw[i];
        const wo = computeG2pV4Word(w, { trace: traceInput.checked, joinMode: joinSelect.value });
        words.push(wo);

        segmentCount += (wo.segments || []).length;
        for(const r of (wo.rows || [])) {
          uniqueSegs.add(r.segment);
          if(r.status === 'missing') missingSegmentCount += 1;
        }

        if((i+1) % chunkSize === 0) {
          // yield to keep UI responsive
          await new Promise(r => setTimeout(r, 0));
        }
      }

      const analysis = {
        ts: Date.now(),
        input: rawText,
        words,
        summary: {
          wordCount,
          rendered: Math.min(limit, wordCount),
          segmentCount,
          missingSegmentCount,
          uniqueSegmentCount: uniqueSegs.size
        }
      };
      return analysis;
    }

    runBtn.addEventListener('click', async ()=>{
      const rawText = String(input.value || '').trim();
      if(!rawText){
        outWrap.innerHTML = '';
        outWrap.appendChild(el('div', {class:'card'}, [el('span', {class:'tag bad'}, ['Empty']), el('span', {class:'muted'}, ['Paste a word or a text block.'])]));
        return;
      }

      runBtn.disabled = true;
      runBtn.textContent = 'Analyzing...';
      outWrap.innerHTML = '';
      outWrap.appendChild(el('div', {class:'card'}, [el('span', {class:'tag'}, ['Working']), el('span', {class:'muted'}, ['Processing words in small batches to avoid freezing the browser.'])]));

      try {
        lastAnalysis = await runAnalysisFromText(rawText);
        renderedCount = lastAnalysis.summary.rendered;
        renderAnalysis(lastAnalysis);

        addG2pV4LexiconHistoryEntry({
          ts: lastAnalysis.ts,
          wordCount: lastAnalysis.summary.wordCount,
          segmentCount: lastAnalysis.summary.segmentCount,
          missingSegmentCount: lastAnalysis.summary.missingSegmentCount,
          uniqueSegmentCount: lastAnalysis.summary.uniqueSegmentCount,
          uniqueBracketSegmentCount: lastAnalysis.summary.uniqueBracketSegmentCount,
          bracketSegmentOccurrences: lastAnalysis.summary.bracketSegmentOccurrences,
          usage: lastAnalysis.summary.usage || [],
          sample: (lastAnalysis.words || []).slice(0, 4).map(w => w.word || w.wordNorm).filter(Boolean),
          input: rawText.slice(0, 5000), // cap to keep history small
          inputLen: rawText.length,
          inputTruncated: rawText.length > 5000
        });
        drawHistory();
      } finally {
        runBtn.disabled = false;
        runBtn.textContent = 'Analyze';
      }
    });

    btnClear.addEventListener('click', ()=>{
      input.value = '';
      outWrap.innerHTML = '';
      lastAnalysis = null;
    });

    joinSelect.addEventListener('change', ()=>{
      prefs.joinMode = joinSelect.value;
      saveG2pV4LexiconPrefs(prefs);
      // Recompute SSML and IPA for already computed analysis
      if(lastAnalysis && Array.isArray(lastAnalysis.words)){
        for(const w of lastAnalysis.words){
          w.ipa = joinIpa(w.ipaParts || [], prefs.joinMode);
          w.ssml = buildIpaSsml(w.word || w.wordNorm, w.ipa);
        }
        renderAnalysis(lastAnalysis);
      }
    });

    btnDownload.addEventListener('click', ()=>{
      if(!lastAnalysis){
        alert('No analysis to download yet.');
        return;
      }
      const stem = 'segmenter_v12_g2p_v4_lexicon_analysis_' + new Date(lastAnalysis.ts || Date.now()).toISOString().replaceAll(':','').replaceAll('.','');
      downloadText(stem + '.json', JSON.stringify(lastAnalysis, null, 2), 'application/json');
    });

    fileLoad.addEventListener('change', async (e)=>{
      const f = e.target.files && e.target.files[0];
      if(!f) return;
      const txt = await f.text();
      const parsed = safeJsonParse(txt);
      if(!parsed.ok || !parsed.value) {
        alert('Invalid JSON');
        fileLoad.value = '';
        return;
      }
      const v = parsed.value;
      if(!v || !Array.isArray(v.words) || !v.summary) {
        alert('Not a G2P V4 analysis file.');
        fileLoad.value = '';
        return;
      }
      lastAnalysis = v;
      input.value = String(v.input || '');
      // apply current join mode for consistency
      for(const w of lastAnalysis.words){
        w.ipa = joinIpa(w.ipaParts || [], joinSelect.value);
        w.ssml = buildIpaSsml(w.word || w.wordNorm, w.ipa);
      }
      renderAnalysis(lastAnalysis);
      fileLoad.value = '';
    });

    // History card
    const histCard = el('div', {class:'card'});
    histCard.appendChild(el('h2', {}, ['G2P V4 History']));
    histCard.appendChild(el('p', {}, ['Most recent first. Click a row to reload the input and re-run analysis.']));

    const histControls = el('div', {class:'row'});
    const histClear = el('button', {class:'btn', type:'button'}, ['Clear History']);
    const histExport = el('button', {class:'btn', type:'button'}, ['Export History']);
    const histImport = el('button', {class:'btn', type:'button'}, ['Import History']);
    const histFile = el('input', {type:'file', accept:'application/json', class:'hidden'});

    histClear.addEventListener('click', ()=>{ saveG2pV4LexiconHistory([]); drawHistory(); });
    histExport.addEventListener('click', ()=>{
      downloadText('segmenter_v12_g2p_v4_history.json', JSON.stringify(loadG2pV4LexiconHistory(), null, 2), 'application/json');
    });
    histImport.addEventListener('click', ()=> histFile.click());
    histFile.addEventListener('change', async (e)=>{
      const f = e.target.files && e.target.files[0];
      if(!f) return;
      const txt = await f.text();
      const parsed = safeJsonParse(txt);
      if(!parsed.ok || !Array.isArray(parsed.value)) {
        alert('Invalid history file');
        histFile.value = '';
        return;
      }
      saveG2pV4LexiconHistory(parsed.value);
      drawHistory();
      histFile.value = '';
    });

    histControls.appendChild(histClear);
    histControls.appendChild(histExport);
    histControls.appendChild(histImport);
    histControls.appendChild(histFile);

    const histWrap = el('div', {id:'g2pV4HistoryWrap'});
    histCard.appendChild(histControls);
    histCard.appendChild(el('div', {class:'divider'}));
    histCard.appendChild(histWrap);
    const histOverallWrap = el('div', {id:'g2pV4HistoryOverall', style:'margin-top:12px;'});
    const histDetailWrap = el('div', {id:'g2pV4HistoryDetail', style:'margin-top:12px;'});
    histCard.appendChild(histOverallWrap);
    histCard.appendChild(histDetailWrap);

    // Lexicon search card
    const lexCard = el('div', {class:'card'});
    lexCard.appendChild(el('h2', {}, ['Rich Lexicon Search']));
    lexCard.appendChild(el('p', {}, ['Search by unit. Shows proper IPA, combination amo manual, and how many English assist variants exist.']));

    const lexSearch = el('input', {type:'search', placeholder:'Search unit (e.g. ngai, wha, ūa...)'});
    const lexInfo = el('div', {class:'row'});
    const lexWrap = el('div');

    lexCard.appendChild(lexSearch);
    lexCard.appendChild(el('div', {style:'margin-top:10px;'}));
    lexCard.appendChild(lexInfo);
    lexCard.appendChild(el('div', {style:'margin-top:10px;'}));
    lexCard.appendChild(lexWrap);


    // Lexicon browser card (full browse + missing variations)
    const browseCard = el('div', {class:'card'});
    browseCard.appendChild(el('h2', {}, ['Rich Lexicon Browser']));
    browseCard.appendChild(el('p', {}, [
      'Browse the selected rich lexicon (V4 or V5). Use the missing-variation filters to find segments that need more work. ',
      'Click a row to copy the unit into the input.'
    ]));

    const browseRowTop = el('div', {class:'row'});
    const browseSearch = el('input', {type:'search', placeholder:'Filter unit...', style:'flex:1; min-width:260px;'});
    const browseSort = el('select', {class:'btn', title:'Sort'});
    browseSort.style.padding = '8px 10px';
    browseSort.style.borderRadius = '10px';
    browseSort.style.background = 'var(--surfaceStrong)';
    browseSort.style.border = '1px solid var(--border)';
    browseSort.style.color = 'var(--text)';

    const sortOpts = [
      {v:'id_desc', t:'Sort: ID (desc)'},
      {v:'id_asc', t:'Sort: ID (asc)'},
      {v:'unit_asc', t:'Sort: Unit (asc)'},
      {v:'unit_desc', t:'Sort: Unit (desc)'},
      {v:'bracket_desc', t:'Bracket Count (High to Low)'},
      {v:'bracket_asc', t:'Bracket Count (Low to High)'},
    ];
    for(const opt of sortOpts){
      const o = el('option', {value: opt.v}, [opt.t]);
      if(opt.v === (prefs.browseSort || 'id_desc')) o.selected = true;
      browseSort.appendChild(o);
    }

    const browseLimitInput = el('input', {type:'number', min:'10', step:'10', value: String(prefs.browseLimit || 300), style:'width:120px;'});
    const browseLimitLabel = el('label', {class:'checkbox'});
    browseLimitLabel.appendChild(el('span', {class:'muted'}, ['Show First']));
    browseLimitLabel.appendChild(browseLimitInput);
    browseLimitLabel.appendChild(el('span', {class:'muted'}, ['Segments']));

    const browseApply = el('button', {class:'btn', type:'button'}, ['Apply']);
    const browseReset = el('button', {class:'btn', type:'button'}, ['Reset']);
    const browseExportCsv = el('button', {class:'btn', type:'button'}, ['Export Filtered CSV']);

    browseRowTop.appendChild(browseSearch);
    browseRowTop.appendChild(browseSort);
    browseRowTop.appendChild(browseLimitLabel);
    browseRowTop.appendChild(browseApply);
    browseRowTop.appendChild(browseReset);
    browseRowTop.appendChild(browseExportCsv);

    const browseRowFilters = el('div', {class:'row', style:'flex-wrap:wrap;'});
    function mkFilterCheck(key, labelText){
      const wrap = el('label', {class:'checkbox'});
      const inp = el('input', {type:'checkbox'});
      inp.checked = !!prefs[key];
      wrap.appendChild(inp);
      wrap.appendChild(document.createTextNode(labelText));
      return {wrap, inp};
    }

    const fMissingAny = mkFilterCheck('browseMissingAny', 'Missing Any Variation');
    const fMissingBracket = mkFilterCheck('browseMissingBracket', 'Missing Bracket Assist');
    const fMissingJust = mkFilterCheck('browseMissingJustPart', 'Missing Just-Part');
    const fOnlyBracket = mkFilterCheck('browseOnlyBracket', 'Only Bracket Assist');
    browseRowFilters.appendChild(fMissingAny.wrap);
    browseRowFilters.appendChild(fMissingBracket.wrap);
    browseRowFilters.appendChild(fMissingJust.wrap);
    browseRowFilters.appendChild(fOnlyBracket.wrap);

    const browseInfo = el('div', {class:'row', style:'flex-wrap:wrap;'});
    const browseWrap = el('div');

    browseCard.appendChild(browseRowTop);
    browseCard.appendChild(el('div', {style:'margin-top:10px;'}));
    browseCard.appendChild(browseRowFilters);
    browseCard.appendChild(el('div', {style:'margin-top:10px;'}));
    browseCard.appendChild(browseInfo);
    browseCard.appendChild(el('div', {style:'margin-top:10px;'}));
    browseCard.appendChild(browseWrap);

    function _v4Flags(r){
      const vars = Array.isArray(r.vars) ? r.vars : [];
      const eng = Array.isArray(r.eng_variants) ? r.eng_variants : [];
      const hasBracket = eng.length > 0 || vars.some(v => v && String(v.bracket || '').trim());
      const hasJustPart = vars.some(v => v && String(v.just_part || '').trim());
      const hasAny = hasBracket || hasJustPart;
      const justCount = vars.filter(v => v && String(v.just_part || '').trim()).length;
      return {hasAny, hasBracket, hasJustPart, bracketCount: eng.length, justCount};
    }

    function _v4GlobalVariationStats(){
      const s = {total:0, hasAny:0, missingAny:0, missingBracket:0, missingJustPart:0, missingBothFields:0};
      for(const r of getRichLexiconRows()){
        s.total += 1;
        const f = _v4Flags(r);
        if(f.hasAny) s.hasAny += 1; else s.missingAny += 1;
        if(!f.hasBracket) s.missingBracket += 1;
        if(!f.hasJustPart) s.missingJustPart += 1;
        if(!f.hasBracket && !f.hasJustPart) s.missingBothFields += 1;
      }
      return s;
    }

    function drawBrowser(){
      const q = String(browseSearch.value || '').trim().toLowerCase();
      const missingAny = !!fMissingAny.inp.checked;
      const missingBracket = !!fMissingBracket.inp.checked;
      const missingJust = !!fMissingJust.inp.checked;
      const onlyBracket = !!fOnlyBracket.inp.checked;
      const sortMode = String(browseSort.value || 'id_desc');
      const limit = Math.max(10, Number(browseLimitInput.value || 300));

      prefs.browseMissingAny = missingAny;
      prefs.browseMissingBracket = missingBracket;
      prefs.browseMissingJustPart = missingJust;
      prefs.browseOnlyBracket = onlyBracket;
      prefs.browseSort = sortMode;
      prefs.browseLimit = limit;
      saveG2pV4LexiconPrefs(prefs);

      let rows = getRichLexiconRows().slice();

      if(q) rows = rows.filter(r => (r.unit_norm || '').includes(q));

      // missing filters (AND together)
      if(missingAny) rows = rows.filter(r => !_v4Flags(r).hasAny);
      if(missingBracket) rows = rows.filter(r => !_v4Flags(r).hasBracket);
      if(missingJust) rows = rows.filter(r => !_v4Flags(r).hasJustPart);
      if(onlyBracket) rows = rows.filter(r => _v4Flags(r).hasBracket);

      rows.sort((a,b)=>{
        const aid = Number(a.segment_id || 0);
        const bid = Number(b.segment_id || 0);
        const au = String(a.unit_norm || a.unit || '');
        const bu = String(b.unit_norm || b.unit || '');
        if(sortMode === 'id_asc') return aid - bid;
        if(sortMode === 'id_desc') return bid - aid;
        if(sortMode === 'unit_desc') return bu.localeCompare(au);
        return au.localeCompare(bu); // unit_asc
      });

      const global = _v4GlobalVariationStats();
      const shown = rows.slice(0, limit);

      let matchesMissingAny = 0;
      let matchesMissingBracket = 0;
      let matchesMissingJust = 0;
      for(const r of rows){
        const f = _v4Flags(r);
        if(!f.hasAny) matchesMissingAny += 1;
        if(!f.hasBracket) matchesMissingBracket += 1;
        if(!f.hasJustPart) matchesMissingJust += 1;
      }

      browseInfo.innerHTML = '';
      browseInfo.appendChild(el('span', {class:'tag'}, ['total: ' + global.total]));
      browseInfo.appendChild(el('span', {class:'tag'}, ['missing any: ' + global.missingAny]));
      browseInfo.appendChild(el('span', {class:'tag'}, ['missing bracket: ' + global.missingBracket]));
      browseInfo.appendChild(el('span', {class:'tag'}, ['missing just-part: ' + global.missingJustPart]));
      browseInfo.appendChild(el('span', {class:'tag'}, ['matches: ' + rows.length]));
      browseInfo.appendChild(el('span', {class:'tag'}, ['shown: ' + shown.length]));
      browseInfo.appendChild(el('span', {class:'tag'}, ['matches missing any: ' + matchesMissingAny]));
      browseInfo.appendChild(el('span', {class:'tag'}, ['matches missing bracket: ' + matchesMissingBracket]));
      browseInfo.appendChild(el('span', {class:'tag'}, ['matches missing just-part: ' + matchesMissingJust]));

      browseWrap.innerHTML = '';
      if(!shown.length){
        browseWrap.appendChild(el('p', {}, ['No segments match the current filters.']));
        return;
      }

      const tbl = el('table');
      const thead = el('thead');
      thead.appendChild(el('tr', {}, [
        el('th', {}, ['ID']),
        el('th', {}, ['Unit']),
        el('th', {}, ['Proper IPA']),
        el('th', {}, ['Phonetic']),
        el('th', {}, ['Bracket Variations']),
        el('th', {}, ['Just-Part Variations']),
        el('th', {}, ['Status'])
      ]));
      tbl.appendChild(thead);
      const tbody = el('tbody');

      for(const r of shown){
        const f = _v4Flags(r);
        const tr = el('tr');
        tr.style.cursor = 'pointer';
        tr.addEventListener('click', ()=>{
          input.value = r.unit || '';
        });

        tr.appendChild(el('td', {class:'mono'}, [String(r.segment_id ?? '')]));
        tr.appendChild(el('td', {class:'mono'}, [r.unit || '']));
        tr.appendChild(el('td', {class:'mono'}, [r.ipa || '']));
        tr.appendChild(el('td', {class:'mono'}, [r.phonetic || '']));
        const bracketVals = _v4GetBracketList(r);
        const justVals = _v4GetJustPartList(r);
        const bPreview = _v4PreviewList(bracketVals, 3);
        const jPreview = _v4PreviewList(justVals, 3);
        tr.appendChild(el('td', {class:'mono', title: bracketVals.join('\n')}, [bPreview]));
        tr.appendChild(el('td', {class:'mono', title: justVals.join('\n')}, [jPreview]));

        const statusCell = el('td');
        if(!f.hasAny){
          statusCell.appendChild(el('span', {class:'tag bad'}, ['missing all']));
        } else {
          if(!f.hasBracket) statusCell.appendChild(el('span', {class:'tag warn'}, ['no bracket']));
          if(!f.hasJustPart) statusCell.appendChild(el('span', {class:'tag warn'}, ['no just-part']));
          if(f.hasBracket && f.hasJustPart) statusCell.appendChild(el('span', {class:'tag good'}, ['ok']));
        }
        tr.appendChild(statusCell);

        tbody.appendChild(tr);
      }
      tbl.appendChild(tbody);
      browseWrap.appendChild(tbl);

      if(rows.length > shown.length){
        const moreRow = el('div', {class:'row', style:'margin-top:10px;'});
        const more = el('button', {class:'btn', type:'button'}, ['Load More']);
        more.addEventListener('click', ()=>{
          browseLimitInput.value = String(limit + 300);
          drawBrowser();
        });
        moreRow.appendChild(el('span', {class:'muted'}, ['More results exist.']));
        moreRow.appendChild(more);
        browseWrap.appendChild(moreRow);
      }
    }

    function exportBrowserCsv(){
      // export *filtered* full list (not limited)
      const q = String(browseSearch.value || '').trim().toLowerCase();
      const missingAny = !!fMissingAny.inp.checked;
      const missingBracket = !!fMissingBracket.inp.checked;
      const missingJust = !!fMissingJust.inp.checked;
      let rows = getRichLexiconRows().slice();
      const onlyBracket = !!fOnlyBracket.inp.checked;
      if(q) rows = rows.filter(r => (r.unit_norm || '').includes(q));
      if(missingAny) rows = rows.filter(r => !_v4Flags(r).hasAny);
      if(missingBracket) rows = rows.filter(r => !_v4Flags(r).hasBracket);
      if(missingJust) rows = rows.filter(r => !_v4Flags(r).hasJustPart);
      if(onlyBracket) rows = rows.filter(r => _v4Flags(r).hasBracket);

      const lines = [];
      lines.push(['segment_id','unit','proper_ipa','phonetic','bracket_variations','just_part_variations','has_bracket','has_just_part'].join(','));
      for(const r of rows){
        const f = _v4Flags(r);
        const safe = (v)=> ('"' + String(v ?? '').replaceAll('"','""') + '"');
        lines.push([
          safe(r.segment_id),
          safe(r.unit),
          safe(r.ipa),
          safe(r.phonetic),
          safe(f.bracketCount),
          safe(f.justCount),
          safe(f.hasBracket ? 'yes' : 'no'),
          safe(f.hasJustPart ? 'yes' : 'no')
        ].join(','));
      }
      const name = 'segmenter_v12_v4_lexicon_browser_' + new Date().toISOString().slice(0,19).replaceAll(':','') + '.csv';
      downloadText(name, lines.join('\n'), 'text/csv');
    }

    browseApply.addEventListener('click', drawBrowser);
    browseReset.addEventListener('click', ()=>{
      browseSearch.value = '';
      fMissingAny.inp.checked = false;
      fMissingBracket.inp.checked = false;
      fMissingJust.inp.checked = false;
      if(typeof fOnlyBracket !== 'undefined') fOnlyBracket.inp.checked = false;
      browseSort.value = 'id_desc';
      browseLimitInput.value = '300';
      drawBrowser();
    });
    browseExportCsv.addEventListener('click', exportBrowserCsv);
    browseSearch.addEventListener('input', ()=>{ drawBrowser(); });
    browseSort.addEventListener('change', ()=>{ drawBrowser(); });
    fMissingAny.inp.addEventListener('change', ()=>{ drawBrowser(); });
    fMissingBracket.inp.addEventListener('change', ()=>{ drawBrowser(); });
    fMissingJust.inp.addEventListener('change', ()=>{ drawBrowser(); });
    if(typeof fOnlyBracket !== 'undefined') fOnlyBracket.inp.addEventListener('change', ()=>{ drawBrowser(); });
    browseLimitInput.addEventListener('change', ()=>{ drawBrowser(); });


    function drawLexicon(q){
      const s = (q || '').trim().toLowerCase();
      let rows = getRichLexiconRows();
      if(s) rows = rows.filter(r => (r.unit_norm || '').includes(s));

      const total = rows.length;
      const shown = rows.slice(0, 120);

      lexInfo.innerHTML = '';
      lexInfo.appendChild(el('span', {class:'tag'}, ['matches: ' + total]));
      lexInfo.appendChild(el('span', {class:'tag'}, ['shown: ' + shown.length]));

      lexWrap.innerHTML = '';
      if(!shown.length){
        lexWrap.appendChild(el('p', {}, ['No matches.']));
        return;
      }

      const tbl = el('table');
      const thead = el('thead');
      thead.appendChild(el('tr', {}, [
        el('th', {}, ['Unit']),
        el('th', {}, ['Proper IPA']),
        el('th', {}, ['ID']),
        el('th', {}, ['Phonetic']),
        el('th', {}, ['Eng Variants'])
      ]));
      tbl.appendChild(thead);
      const tbody = el('tbody');

      for(const r of shown){
        const tr = el('tr');
        tr.addEventListener('click', ()=>{ input.value = r.unit || ''; });
        tr.appendChild(el('td', {class:'mono'}, [r.unit || '']));
        tr.appendChild(el('td', {class:'mono'}, [r.ipa || '']));
        tr.appendChild(el('td', {class:'mono'}, [String(r.segment_id ?? '')]));
        tr.appendChild(el('td', {class:'mono'}, [r.phonetic || '']));
        tr.appendChild(el('td', {class:'mono'}, [String(_v4Flags(r).bracketCount)]));
        tbody.appendChild(tr);
      }
      tbl.appendChild(tbody);
      lexWrap.appendChild(tbl);
    }

    lexSearch.addEventListener('input', ()=> drawLexicon(lexSearch.value));

    function drawHistory(){
      const itemsRaw = loadG2pV4LexiconHistory();
      const items = (itemsRaw || []).filter(Boolean);
      histWrap.innerHTML = '';
      histOverallWrap.innerHTML = '';
      histDetailWrap.innerHTML = '';

      function normUsage(u){
        if(!u) return null;
        const seg = u.segment || u.chosenUnit || u.unit || '';
        if(!seg) return null;
        return {
          segment: String(seg),
          count: Number(u.count || 0),
          chosenId: (u.chosenId == null ? null : Number(u.chosenId)),
          chosenUnit: String(u.chosenUnit || u.unit || seg),
          chosenIpa: String(u.chosenIpa || u.ipa || ''),
          chosenPhonetic: String(u.chosenPhonetic || u.phonetic || ''),
          bracketVarCount: Number(u.bracketVarCount || 0),
          bracketParenCount: Number(u.bracketParenCount || 0),
          justPartCount: Number(u.justPartCount || 0),
          hasBracket: !!u.hasBracket || Number(u.bracketVarCount || 0) > 0
        };
      }

      // History table
      if(!items.length){
        histWrap.appendChild(el('p', {}, ['No history yet.']));
      } else {
        const tbl = el('table');
        const thead = el('thead');
        thead.appendChild(el('tr', {}, [
          el('th', {}, ['Time']),
          el('th', {}, ['Words']),
          el('th', {}, ['Segments']),
          el('th', {}, ['Unique']),
          el('th', {}, ['Bracket']),
          el('th', {}, ['Trunc']),
          el('th', {}, ['Actions'])
        ]));
        tbl.appendChild(thead);

        const tbody = el('tbody');

        items.forEach((item, idx)=>{
          const tr = el('tr');

          const dt = item.ts ? new Date(item.ts) : null;
          tr.appendChild(el('td', {}, [dt ? dt.toLocaleString() : '']));
          tr.appendChild(el('td', {class:'mono'}, [String(item.wordCount || '')]));
          tr.appendChild(el('td', {class:'mono'}, [String(item.segmentCount || '')]));
          tr.appendChild(el('td', {class:'mono'}, [String(item.uniqueSegmentCount || '')]));
          tr.appendChild(el('td', {class:'mono'}, [String(item.uniqueBracketSegmentCount || '')]));
          tr.appendChild(el('td', {class:'mono'}, [item.inputTruncated ? 'Yes' : '']));

          const actions = el('td');
          const btnLoad = el('button', {class:'btn btn-sm'}, ['Load']);
          const btnSegments = el('button', {class:'btn btn-sm'}, ['Segments']);
          const btnDelete = el('button', {class:'btn btn-sm btn-danger'}, ['Delete']);

          btnLoad.addEventListener('click', (ev)=>{
            ev.stopPropagation();
            input.value = item.input || '';
            if(item.inputTruncated){
              alert('This entry stored only the first 5,000 characters of the original text. Input length was ' + String(item.inputLen || '') + '.');
            }
          });

          btnSegments.addEventListener('click', (ev)=>{
            ev.stopPropagation();
            renderEntryDetail(item);
          });

          btnDelete.addEventListener('click', (ev)=>{
            ev.stopPropagation();
            if(!confirm('Delete this history entry?')) return;
            const copy = loadG2pV4LexiconHistory();
            copy.splice(idx, 1);
            try {
              saveG2pV4LexiconHistory(copy);
            } catch (e) {}
            drawHistory();
          });

          actions.appendChild(btnLoad);
          actions.appendChild(btnSegments);
          actions.appendChild(btnDelete);
          tr.appendChild(actions);

          tbody.appendChild(tr);
        });

        tbl.appendChild(tbody);
        histWrap.appendChild(tbl);
      }

      // Overall usage aggregation
      const aggMap = new Map();
      for(const item of items){
        const usageArr = Array.isArray(item.usage) ? item.usage : [];
        for(const u0 of usageArr){
          const u = normUsage(u0);
          if(!u) continue;
          const key = u.segment;
          let a = aggMap.get(key);
          if(!a){
            a = {
              segment: key,
              totalCount: 0,
              entryCount: 0,
              chosenId: u.chosenId,
              chosenUnit: u.chosenUnit,
              chosenIpa: u.chosenIpa,
              chosenPhonetic: u.chosenPhonetic,
              bracketVarCount: u.bracketVarCount,
              bracketParenCount: u.bracketParenCount,
              justPartCount: u.justPartCount,
              hasBracket: u.hasBracket
            };
            aggMap.set(key, a);
          }
          a.totalCount += u.count;
          a.entryCount += 1;
          if(u.chosenId != null && (a.chosenId == null || u.chosenId > a.chosenId)) a.chosenId = u.chosenId;
          if((u.bracketVarCount || 0) > (a.bracketVarCount || 0)) a.bracketVarCount = u.bracketVarCount;
          if((u.bracketParenCount || 0) > (a.bracketParenCount || 0)) a.bracketParenCount = u.bracketParenCount;
          if((u.justPartCount || 0) > (a.justPartCount || 0)) a.justPartCount = u.justPartCount;
          if(u.hasBracket) a.hasBracket = true;
        }
      }
      const agg = Array.from(aggMap.values()).sort((a,b)=> (b.totalCount - a.totalCount) || ((b.chosenId||0)-(a.chosenId||0)) || String(a.segment).localeCompare(String(b.segment)));

      // Overall UI
      const overallCard = el('div', {class:'card'});
      overallCard.appendChild(el('h4', {}, ['Overall Segment Usage (History)']));
      const overallMeta = el('div', {class:'row', style:'flex-wrap:wrap;'});
      const totalOcc = agg.reduce((s,a)=> s + (a.totalCount||0), 0);
      overallMeta.appendChild(el('span', {class:'tag'}, ['Entries: ' + String(items.length)]));
      overallMeta.appendChild(el('span', {class:'tag'}, ['Unique Segments: ' + String(agg.length)]));
      overallMeta.appendChild(el('span', {class:'tag'}, ['Occurrences: ' + String(totalOcc)]));
      overallCard.appendChild(overallMeta);

      const overallControls = el('div', {class:'row', style:'flex-wrap:wrap; margin-top:8px;'});
      const overallSearch = el('input', {type:'text', placeholder:'Search segment…', value:''});
      const overallOnlyBracket = el('label', {class:'checkbox'}, [
        el('input', {type:'checkbox'}), document.createTextNode('Only Bracket Assist')
      ]);
      const overallSort = el('select');
      ['count_desc|Count (High to Low)','count_asc|Count (Low to High)','bracket_desc|Bracket Count (High to Low)','bracket_asc|Bracket Count (Low to High)','seg_asc|Segment (A-Z)','seg_desc|Segment (Z-A)'].forEach(v=>{
        const parts = v.split('|');
        overallSort.appendChild(el('option', {value:parts[0]}, [parts[1]]));
      });
      overallControls.appendChild(overallSearch);
      overallControls.appendChild(overallOnlyBracket);
      overallControls.appendChild(overallSort);
      overallCard.appendChild(overallControls);

      const overallTableWrap = el('div', {style:'margin-top:10px;'});
      overallCard.appendChild(overallTableWrap);

      function drawOverall(){
        const q = String(overallSearch.value || '').trim().toLowerCase();
        const onlyB = overallOnlyBracket.querySelector('input').checked;
        let rows = agg.slice();
        if(q){
          rows = rows.filter(r => String(r.segment).toLowerCase().includes(q) || String(r.chosenUnit||'').toLowerCase().includes(q));
        }
        if(onlyB){
          rows = rows.filter(r => !!r.hasBracket || (r.bracketVarCount||0) > 0);
        }
        const sm = String(overallSort.value || 'count_desc');
        switch(sm){
          case 'count_asc': rows.sort((a,b)=> (a.totalCount-b.totalCount) || String(a.segment).localeCompare(String(b.segment))); break;
          case 'bracket_desc': rows.sort((a,b)=> ((b.bracketVarCount||0)-(a.bracketVarCount||0)) || (b.totalCount-a.totalCount)); break;
          case 'bracket_asc': rows.sort((a,b)=> ((a.bracketVarCount||0)-(b.bracketVarCount||0)) || (b.totalCount-a.totalCount)); break;
          case 'seg_desc': rows.sort((a,b)=> String(b.segment).localeCompare(String(a.segment))); break;
          case 'seg_asc': default: rows.sort((a,b)=> String(a.segment).localeCompare(String(b.segment))); break;
          case 'count_desc': rows.sort((a,b)=> (b.totalCount-a.totalCount) || String(a.segment).localeCompare(String(b.segment))); break;
        }

        overallTableWrap.innerHTML = '';
        if(!rows.length){
          overallTableWrap.appendChild(el('p', {}, ['No matches.']));
          return;
        }
        const tbl = el('table');
        const thead = el('thead');
        thead.appendChild(el('tr', {}, [
          el('th', {}, ['Segment']),
          el('th', {}, ['Count']),
          el('th', {}, ['Blocks']),
          el('th', {}, ['ID']),
          el('th', {}, ['Bracket'])
        ]));
        tbl.appendChild(thead);
        const tbody = el('tbody');
        const limit = Math.min(rows.length, 500);
        for(let i=0;i<limit;i++){
          const r = rows[i];
          const tr = el('tr');
          tr.appendChild(el('td', {class:'mono'}, [String(r.segment)]));
          tr.appendChild(el('td', {class:'mono'}, [String(r.totalCount)]));
          tr.appendChild(el('td', {class:'mono'}, [String(r.entryCount)]));
          tr.appendChild(el('td', {class:'mono'}, [String(r.chosenId||'')]));
          tr.appendChild(el('td', {class:'mono'}, [String(r.bracketVarCount||0)]));
          tr.addEventListener('click', ()=>{
            renderSegmentDetail(r);
          });
          tbody.appendChild(tr);
        }
        tbl.appendChild(tbody);
        overallTableWrap.appendChild(tbl);
        if(rows.length > limit){
          overallTableWrap.appendChild(el('p', {class:'muted'}, ['Showing first ' + String(limit) + ' rows of ' + String(rows.length) + '.']));
        }
      }

      overallSearch.addEventListener('input', ()=>{ drawOverall(); });
      overallOnlyBracket.querySelector('input').addEventListener('change', ()=>{ drawOverall(); });
      overallSort.addEventListener('change', ()=>{ drawOverall(); });

      histOverallWrap.appendChild(overallCard);
      drawOverall();

      function renderEntryDetail(item){
        histDetailWrap.innerHTML = '';
        const card = el('div', {class:'card'});
        card.appendChild(el('h4', {}, ['Entry Segment Usage']));
        const dt = item.ts ? new Date(item.ts) : null;
        const meta = el('div', {class:'row', style:'flex-wrap:wrap;'});
        meta.appendChild(el('span', {class:'tag'}, [dt ? dt.toLocaleString() : '']));
        meta.appendChild(el('span', {class:'tag'}, ['Words: ' + String(item.wordCount || 0)]));
        meta.appendChild(el('span', {class:'tag'}, ['Segments: ' + String(item.segmentCount || 0)]));
        meta.appendChild(el('span', {class:'tag'}, ['Unique: ' + String(item.uniqueSegmentCount || 0)]));
        meta.appendChild(el('span', {class:'tag'}, ['Bracket: ' + String(item.uniqueBracketSegmentCount || 0)]));
        if(item.inputTruncated) meta.appendChild(el('span', {class:'tag'}, ['Input Truncated']));
        card.appendChild(meta);

        const controls = el('div', {class:'row', style:'flex-wrap:wrap; margin-top:8px;'});
        const q = el('input', {type:'text', placeholder:'Search segment…', value:''});
        const onlyB = el('label', {class:'checkbox'}, [
          el('input', {type:'checkbox'}), document.createTextNode('Only Bracket Assist')
        ]);
        const sortSel = el('select');
        ['count_desc|Count (High to Low)','count_asc|Count (Low to High)','bracket_desc|Bracket Count (High to Low)','bracket_asc|Bracket Count (Low to High)','seg_asc|Segment (A-Z)','seg_desc|Segment (Z-A)'].forEach(v=>{
          const parts = v.split('|');
          sortSel.appendChild(el('option', {value:parts[0]}, [parts[1]]));
        });
        controls.appendChild(q);
        controls.appendChild(onlyB);
        controls.appendChild(sortSel);
        card.appendChild(controls);

        const tableWrap = el('div', {style:'margin-top:10px;'});
        card.appendChild(tableWrap);

        const usageArr = (Array.isArray(item.usage) ? item.usage.map(normUsage).filter(Boolean) : []).slice();

        function draw(){
          const qq = String(q.value||'').trim().toLowerCase();
          const ob = onlyB.querySelector('input').checked;
          let rows = usageArr.slice();
          if(qq) rows = rows.filter(r => String(r.segment).toLowerCase().includes(qq) || String(r.chosenUnit||'').toLowerCase().includes(qq));
          if(ob) rows = rows.filter(r => !!r.hasBracket || (r.bracketVarCount||0) > 0);
          const sm = String(sortSel.value || 'count_desc');
          switch(sm){
            case 'count_asc': rows.sort((a,b)=> (a.count-b.count) || String(a.segment).localeCompare(String(b.segment))); break;
            case 'bracket_desc': rows.sort((a,b)=> ((b.bracketVarCount||0)-(a.bracketVarCount||0)) || (b.count-a.count)); break;
            case 'bracket_asc': rows.sort((a,b)=> ((a.bracketVarCount||0)-(b.bracketVarCount||0)) || (b.count-a.count)); break;
            case 'seg_desc': rows.sort((a,b)=> String(b.segment).localeCompare(String(a.segment))); break;
            case 'seg_asc': default: rows.sort((a,b)=> String(a.segment).localeCompare(String(b.segment))); break;
            case 'count_desc': rows.sort((a,b)=> (b.count-a.count) || String(a.segment).localeCompare(String(b.segment))); break;
          }

          tableWrap.innerHTML = '';
          if(!rows.length){
            tableWrap.appendChild(el('p', {}, ['No matches.']));
            return;
          }
          const tbl = el('table');
          const thead = el('thead');
          thead.appendChild(el('tr', {}, [
            el('th', {}, ['Segment']),
            el('th', {}, ['Count']),
            el('th', {}, ['ID']),
            el('th', {}, ['Phonetic']),
            el('th', {}, ['Bracket'])
          ]));
          tbl.appendChild(thead);
          const tbody = el('tbody');
          const limit = Math.min(rows.length, 500);
          for(let i=0;i<limit;i++){
            const r = rows[i];
            const tr = el('tr');
            tr.appendChild(el('td', {class:'mono'}, [String(r.segment)]));
            tr.appendChild(el('td', {class:'mono'}, [String(r.count)]));
            tr.appendChild(el('td', {class:'mono'}, [String(r.chosenId||'')]));
            tr.appendChild(el('td', {class:'mono'}, [String(r.chosenPhonetic||'')]));
            tr.appendChild(el('td', {class:'mono'}, [String(r.bracketVarCount||0)]));
            tr.addEventListener('click', ()=>{ copyToClipboard(String(r.segment)); });
            tbody.appendChild(tr);
          }
          tbl.appendChild(tbody);
          tableWrap.appendChild(tbl);
          if(rows.length > limit){
            tableWrap.appendChild(el('p', {class:'muted'}, ['Showing first ' + String(limit) + ' rows of ' + String(rows.length) + '.']));
          }
        }

        q.addEventListener('input', ()=>{ draw(); });
        onlyB.querySelector('input').addEventListener('change', ()=>{ draw(); });
        sortSel.addEventListener('change', ()=>{ draw(); });
        draw();

        histDetailWrap.appendChild(card);
      }

      function renderSegmentDetail(row){
        histDetailWrap.innerHTML = '';
        const card = el('div', {class:'card'});
        card.appendChild(el('h4', {}, ['Segment Detail']));
        const meta = el('div', {class:'row', style:'flex-wrap:wrap;'});
        meta.appendChild(el('span', {class:'tag'}, ['Segment: ' + String(row.segment)]));
        meta.appendChild(el('span', {class:'tag'}, ['Total: ' + String(row.totalCount)]));
        meta.appendChild(el('span', {class:'tag'}, ['Blocks: ' + String(row.entryCount)]));
        meta.appendChild(el('span', {class:'tag'}, ['ID: ' + String(row.chosenId||'')]));
        meta.appendChild(el('span', {class:'tag'}, ['Bracket: ' + String(row.bracketVarCount||0)]));
        card.appendChild(meta);

        const listWrap = el('div', {style:'margin-top:10px;'});
        card.appendChild(listWrap);

        const rows = [];
        for(const item of items){
          const usageArr = Array.isArray(item.usage) ? item.usage : [];
          const found = usageArr.map(normUsage).find(u => u && u.segment === row.segment);
          if(found){
            const dt = item.ts ? new Date(item.ts) : null;
            rows.push({
              ts: item.ts,
              time: dt ? dt.toLocaleString() : '',
              count: found.count,
              words: item.wordCount || 0,
              segs: item.segmentCount || 0,
              truncated: !!item.inputTruncated,
              input: item.input || ''
            });
          }
        }
        rows.sort((a,b)=> (b.count-a.count) || ((b.ts||0)-(a.ts||0)));

        if(!rows.length){
          listWrap.appendChild(el('p', {}, ['No usage found.']));
        } else {
          const tbl = el('table');
          const thead = el('thead');
          thead.appendChild(el('tr', {}, [
            el('th', {}, ['Time']),
            el('th', {}, ['Count']),
            el('th', {}, ['Words']),
            el('th', {}, ['Trunc']),
            el('th', {}, ['Load'])
          ]));
          tbl.appendChild(thead);
          const tbody = el('tbody');
          const limit = Math.min(rows.length, 200);
          for(let i=0;i<limit;i++){
            const r = rows[i];
            const tr = el('tr');
            tr.appendChild(el('td', {}, [r.time]));
            tr.appendChild(el('td', {class:'mono'}, [String(r.count)]));
            tr.appendChild(el('td', {class:'mono'}, [String(r.words)]));
            tr.appendChild(el('td', {class:'mono'}, [r.truncated ? 'Yes' : '']));
            const td = el('td');
            const btn = el('button', {class:'btn btn-sm'}, ['Load']);
            btn.addEventListener('click', ()=>{
              input.value = r.input || '';
              if(r.truncated){
                alert('This entry stored only the first 5,000 characters of the original text.');
              }
            });
            td.appendChild(btn);
            tr.appendChild(td);
            tbody.appendChild(tr);
          }
          tbl.appendChild(tbody);
          listWrap.appendChild(tbl);
          if(rows.length > limit){
            listWrap.appendChild(el('p', {class:'muted'}, ['Showing first ' + String(limit) + ' rows of ' + String(rows.length) + '.']));
          }
        }

        histDetailWrap.appendChild(card);
      }

      // History controls
      if(typeof g2pV4HistExportBtn !== 'undefined'){
        g2pV4HistExportBtn.onclick = ()=>{
          const items2 = loadG2pV4LexiconHistory();
          const blob = new Blob([JSON.stringify(items2 || [], null, 2)], {type:'application/json'});
          downloadBlob(blob, 'g2p_v4_history_' + new Date().toISOString().replace(/[:.]/g,'-') + '.json');
        };
        g2pV4HistImportBtn.onclick = ()=>{ g2pV4HistFile.click(); };
        g2pV4HistFile.onchange = async ()=>{
          const file = g2pV4HistFile.files && g2pV4HistFile.files[0];
          if(!file) return;
          try {
            const txt = await file.text();
            const parsed = safeJsonParse(txt);
            if(!parsed.ok || !Array.isArray(parsed.value)){
              alert('Invalid history JSON.');
              return;
            }
            const merged = parsed.value.filter(Boolean);
            try { saveG2pV4LexiconHistory(merged.slice(0, 200)); } catch(e){}
            drawHistory();
          } catch (e) {
            alert('Failed to import history.');
          } finally {
            g2pV4HistFile.value = '';
          }
        };
        g2pV4HistClearBtn.onclick = ()=>{
          if(!confirm('Clear all G2P V4 history?')) return;
          try { saveG2pV4LexiconHistory([]); } catch(e){}
          drawHistory();
        };
      }
    }

    // mount support cards under the output
    root.appendChild(histCard);
    root.appendChild(lexCard);
    root.appendChild(browseCard);

    // initial renders
    drawHistory();
    drawLexicon('');
    drawBrowser();
}

  function renderPublicDemoTabVariant(cfg){
    cfg = cfg || {};
    const rootId = cfg.rootId || 'pagePublicDemo';
    const pageTitle = cfg.title || 'Public Demo';
    const inputId = cfg.inputId || 'publicDemoInput';
    const idPrefix = cfg.idPrefix || 'publicDemo';
    const draftKey = cfg.draftKey || 'reorite_segmenter_v12_public_demo_draft';
    const showExamples = cfg.showExamples !== false;
    const showSummary = cfg.showSummary !== false;
    const resultsTitle = cfg.resultsTitle || '';
    const singleColumnDetails = cfg.singleColumnDetails === true;
    const collapsibleSegmentMapping = cfg.collapsibleSegmentMapping === true;
    const modernSimpleLayout = cfg.modernSimpleLayout === true;
    const includeAwsControls = cfg.includeAwsControls === true;
    const includeAwsPlayback = cfg.includeAwsPlayback === true;
    const root = document.getElementById(rootId);
    root.innerHTML = '';
    root.classList.toggle('publicSimplePage', modernSimpleLayout);

    const prefs = loadG2pV4LexiconPrefs();
    const PUBLIC_DEMO_EXAMPLES = [
      {
        label: 'Single Word',
        value: 'whakapapa',
        note: 'Fastest way to see one complete word card with segment mapping.'
      },
      {
        label: 'Place Name',
        value: 'mangataiore',
        note: 'Shows a longer segmentation pattern that is useful for pronunciation breakdown.'
      },
      {
        label: 'Short Phrase',
        value: 'Tena koe e hoa',
        note: 'Demonstrates multi-word analysis while keeping the output easy to scan.'
      }
    ];
    if(!prefs.joinMode) prefs.joinMode = 'space';
    if(typeof prefs.renderLimit !== 'number') prefs.renderLimit = 60;

    let lastAnalysis = null;
    let renderedCount = 0;
    const richLexiconControl = buildLexiconSourceControl('rich', ()=>{ renderPublicDemoTabVariant(cfg); }, 'Public demo rich lexicon source');

    const card = el('div', {class:'card' + (modernSimpleLayout ? ' publicSimpleHeroCard' : '')});
    const hero = el('div', {class:'publicDemoHero' + (modernSimpleLayout ? ' publicSimpleHero' : '')});
    const intro = el('div', {class:'publicDemoIntro'});
    intro.appendChild(el('h2', {}, [pageTitle]));
    intro.appendChild(el('p', {}, [
      'A simplified pronunciation preview built from the selected V4/V5 rich lexicon workflow. ',
      'This tab is intentionally trimmed for public-facing use: you can analyze text, inspect segment mapping, and copy the output you need without exposing the internal history and lexicon management tools.'
    ]));
    const heroTags = el('div', {class:'row'});
    heroTags.appendChild(el('span', {class:'tag'}, ['Public-facing']));
    heroTags.appendChild(el('span', {class:'tag'}, ['No history tools']));
    heroTags.appendChild(el('span', {class:'tag'}, ['Segment mapping only']));
    intro.appendChild(heroTags);
    intro.appendChild(richLexiconControl.wrap);
    hero.appendChild(intro);

    const quick = el('div', {class:'publicDemoQuick' + (modernSimpleLayout ? ' publicSimpleQuick' : '')});
    quick.appendChild(el('h3', {}, ['Quick Start']));
    const steps = el('ol', {class:'publicDemoSteps'});
    steps.appendChild(el('li', {}, [showExamples ? 'Choose an example or paste your own text.' : 'Paste your own text into the input below.']));
    steps.appendChild(el('li', {}, ['Run Analyze to generate segments, IPA, and English assist output.']));
    steps.appendChild(el('li', {}, ['Open Segment Mapping to inspect each detected unit.']));
    quick.appendChild(steps);
    hero.appendChild(quick);
    card.appendChild(hero);

    if(showExamples){
      const exampleGrid = el('div', {class:'publicDemoExamples'});
      for(const example of PUBLIC_DEMO_EXAMPLES){
        const exCard = el('div', {class:'publicDemoExampleCard'});
        exCard.appendChild(el('h3', {}, [example.label]));
        exCard.appendChild(el('p', {}, [example.note]));
        exCard.appendChild(el('pre', {class:'mono'}, [example.value]));
        const exRow = el('div', {class:'row'});
        const loadBtn = el('button', {class:'btn', type:'button'}, ['Use Example']);
        const tryBtn = el('button', {class:'btn primary', type:'button'}, ['Use And Analyze']);
        exRow.appendChild(loadBtn);
        exRow.appendChild(tryBtn);
        exCard.appendChild(exRow);
        loadBtn.addEventListener('click', ()=>{
          input.value = example.value;
          saveToStorage(draftKey, input.value);
        });
        tryBtn.addEventListener('click', ()=>{
          input.value = example.value;
          saveToStorage(draftKey, input.value);
          runBtn.click();
        });
        exampleGrid.appendChild(exCard);
      }
      card.appendChild(exampleGrid);
    }

    const input = el('textarea', {rows: 5, placeholder:'Paste a word or a block of text...'});
    input.style.width = '100%';
    input.value = loadFromStorage(draftKey);

    const traceCheck = el('label', {class:'checkbox'});
    const traceInput = el('input', {type:'checkbox'});
    traceInput.checked = false;
    traceCheck.appendChild(traceInput);
    traceCheck.appendChild(document.createTextNode('Include Trace'));

    const joinSelect = el('select', {class:'btn', title:'IPA join style'});
    joinSelect.style.padding = '8px 10px';
    joinSelect.style.borderRadius = '10px';
    joinSelect.style.background = 'var(--surfaceStrong)';
    joinSelect.style.border = '1px solid var(--border)';
    joinSelect.style.color = 'var(--text)';

    const joinOptions = [
      {v:'space', t:'IPA Join: space'},
      {v:'dot', t:'IPA Join: dot'},
      {v:'none', t:'IPA Join: none'}
    ];
    for(const opt of joinOptions){
      const o = el('option', {value: opt.v}, [opt.t]);
      if(opt.v === (prefs.joinMode || 'space')) o.selected = true;
      joinSelect.appendChild(o);
    }

    const renderLimitInput = el('input', {type:'number', min:'1', step:'1', value: String(prefs.renderLimit || 60), style:'width:110px;'});
    const renderLimitLabel = el('label', {class:'checkbox'});
    renderLimitLabel.appendChild(el('span', {class:'muted'}, ['Render First']));
    renderLimitLabel.appendChild(renderLimitInput);
    renderLimitLabel.appendChild(el('span', {class:'muted'}, ['Words']));

    let modeSelect = null;
    let outputModeSelect = null;
    let speakInput = null;
    let emptyBodyInput = null;
    let punctInput = null;
    let hyphenInput = null;
    let trimNonFinalHInput = null;
    let removeLowerArticulationInput = null;
    let strictInput = null;
    let autoThr = null;
    let autoThrLabel = null;
    let autoDetectRow = null;
    let autoDetectPanel = null;
    let autoDebugInput = null;
    let autoOverrideTag = null;
    let autoDetectSummary = null;
    let autoDetectHighlight = null;
    let autoDetectBlocks = null;
    let autoDetectTable = null;
    let autoDetectSelected = null;
    let mixedWrapPanel = null;
    let mixedWrapList = null;
    let ssmlOut = null;
    let ssmlStatus = null;
    let ssmlMapWrap = null;
    let ssmlTraceWrap = null;
    let playCard = null;
    let playbackServiceRegion = null;
    let playbackAwsRegion = null;
    let playbackVoiceId = null;
    let playbackEngine = null;
    let playbackLanguageCode = null;
    let playbackOutputFormat = null;
    let playbackAccessKeyId = null;
    let playbackSecretAccessKey = null;
    let playbackSessionToken = null;
    let playbackRememberInput = null;
    let playbackAudio = null;
    let playbackTrace = null;
    let playbackLastAudioBlob = null;
    const publicMixedWrap = includeAwsControls ? Object.assign({}, ((loadG2pAwsTtsPrefs() || {}).mixedWrap || {})) : {};
    const publicAutoDetectState = { overrides: {}, selectedKey: null, lastHash: '' };

    if(includeAwsControls){
      const awsPrefs = loadG2pAwsTtsPrefs();

      modeSelect = el('select', {class:'btn', title:'Input mode', 'aria-label':'Public simple input mode'});
      modeSelect.style.padding = '8px 10px';
      modeSelect.style.borderRadius = '10px';
      modeSelect.style.background = 'var(--surfaceStrong)';
      modeSelect.style.border = '1px solid var(--border)';
      modeSelect.style.color = 'var(--text)';
      for(const opt of [
        {v:'text', t:'Input: Text Block'},
        {v:'list', t:'Input: Word List'},
        {v:'single', t:'Input: Single Word'}
      ]){
        const o = el('option', {value: opt.v}, [opt.t]);
        if(opt.v === (awsPrefs.inputMode || 'text')) o.selected = true;
        modeSelect.appendChild(o);
      }

      outputModeSelect = el('select', {class:'btn', title:'SSML output mode', 'aria-label':'Public simple SSML output mode'});
      outputModeSelect.style.padding = '8px 10px';
      outputModeSelect.style.borderRadius = '10px';
      outputModeSelect.style.background = 'var(--surfaceStrong)';
      outputModeSelect.style.border = '1px solid var(--border)';
      outputModeSelect.style.color = 'var(--text)';
      for(const opt of [
        {v:'phoneme', t:'Output: Phoneme (Wrap All)'},
        {v:'plain', t:'Output: Plain Speak (No Phoneme)'},
        {v:'mixedAuto', t:'Output: Mixed (Auto Detect Te Reo)'},
        {v:'mixed', t:'Output: Mixed (Select Words)'}
      ]){
        const o = el('option', {value: opt.v}, [opt.t]);
        if(opt.v === (awsPrefs.outputMode || 'phoneme')) o.selected = true;
        outputModeSelect.appendChild(o);
      }

      speakInput = el('input', {type:'checkbox', name:idPrefix + 'WrapSpeak', 'aria-label':'Wrap output in speak tag'});
      speakInput.checked = !!awsPrefs.wrapSpeak;
      emptyBodyInput = el('input', {type:'checkbox', name:idPrefix + 'EmptyPhonemeBody', 'aria-label':'Use empty phoneme body'});
      emptyBodyInput.checked = !!awsPrefs.emptyPhonemeBody;
      punctInput = el('input', {type:'checkbox', name:idPrefix + 'PreservePunctuation', 'aria-label':'Preserve punctuation'});
      punctInput.checked = !!awsPrefs.preservePunct;
      hyphenInput = el('input', {type:'checkbox', name:idPrefix + 'SplitHyphenParts', 'aria-label':'Split hyphen parts'});
      hyphenInput.checked = !!awsPrefs.splitHyphen;
      trimNonFinalHInput = el('input', {type:'checkbox', name:idPrefix + 'TrimNonFinalH', 'aria-label':'Trim non final IPA h'});
      trimNonFinalHInput.checked = !!awsPrefs.trimNonFinalH;
      removeLowerArticulationInput = el('input', {type:'checkbox', name:idPrefix + 'RemoveLowerArticulation', 'aria-label':'Remove lower articulation from SSML'});
      removeLowerArticulationInput.checked = !!awsPrefs.removeLowerArticulation;
      strictInput = el('input', {type:'checkbox', name:idPrefix + 'StrictMissing', 'aria-label':'Treat missing lexicon segments strictly'});
      strictInput.checked = !!awsPrefs.strictMissing;

      autoDetectRow = el('div', {class:'row', style:'margin-top:10px; display:none; gap:8px; flex-wrap:wrap;'});
      autoThrLabel = el('span', {class:'tag'}, ['Token threshold: 75%']);
      autoThr = el('input', {type:'range', min:'0.50', max:'0.90', step:'0.01', value:String((awsPrefs.autoDetectThreshold != null ? awsPrefs.autoDetectThreshold : 0.75)), style:'width:220px;', 'aria-label':'Auto detect threshold'});
      autoThrLabel.textContent = 'Token threshold: ' + Math.round(parseFloat(autoThr.value || '0.75') * 100) + '%';
      autoDebugInput = el('input', {type:'checkbox', 'aria-label':'Show auto detect debug'});
      autoDebugInput.checked = !!awsPrefs.autoDetectShowDebug;
      const autoDebugLabel = el('label', {class:'checkbox'});
      autoDebugLabel.appendChild(autoDebugInput);
      autoDebugLabel.appendChild(document.createTextNode('Show Debug'));
      autoOverrideTag = el('span', {class:'tag'}, ['Overrides: 0']);
      const btnAutoResetOverrides = el('button', {class:'btn', type:'button', title:'Clear manual include and exclude toggles for auto-detected tokens.'}, ['Reset Overrides']);
      btnAutoResetOverrides.addEventListener('click', ()=>{
        publicAutoDetectState.overrides = {};
        publicAutoDetectState.selectedKey = null;
        generateAwsSsmlFromCurrent();
      });
      autoDetectRow.appendChild(autoThrLabel);
      autoDetectRow.appendChild(autoThr);
      autoDetectRow.appendChild(autoDebugLabel);
      autoDetectRow.appendChild(autoOverrideTag);
      autoDetectRow.appendChild(btnAutoResetOverrides);

      autoDetectPanel = el('div', {class:'card', style:'margin-top:10px; display:none;'});
      autoDetectPanel.appendChild(el('h3', {}, ['Auto Detect Te Reo']));
      autoDetectPanel.appendChild(el('p', {class:'muted'}, ['When Output Mode is set to Mixed (Auto Detect Te Reo), likely te reo Maori tokens are wrapped in phoneme tags and other tokens stay as plain text inside the speak block.']));
      autoDetectSummary = el('div', {style:'margin-top:10px;'});
      autoDetectSummary.appendChild(el('div', {class:'muted'}, ['Included tokens show a subtle dot. Click a token to inspect details. Shift-click a token to toggle processing for that token. Manual overrides show Override.']));
      autoDetectHighlight = el('div', {class:'hlText', style:'margin-top:10px;'});
      autoDetectBlocks = el('div', {style:'margin-top:6px; display:flex; flex-wrap:wrap; gap:8px;'});
      const autoWordWrap = el('div', {style:'margin-top:6px; overflow:auto;'});
      autoDetectTable = el('table', {class:'tbl'});
      autoWordWrap.appendChild(autoDetectTable);
      autoDetectSelected = el('div', {style:'margin-top:6px;'});
      autoDetectPanel.appendChild(autoDetectSummary);
      autoDetectPanel.appendChild(el('div', {class:'muted', style:'margin-top:12px;'}, ['Highlighted Text']));
      autoDetectPanel.appendChild(autoDetectHighlight);
      autoDetectPanel.appendChild(el('div', {class:'muted', style:'margin-top:12px;'}, ['Detected Blocks']));
      autoDetectPanel.appendChild(autoDetectBlocks);
      autoDetectPanel.appendChild(el('div', {class:'muted', style:'margin-top:12px;'}, ['Word Details']));
      autoDetectPanel.appendChild(autoWordWrap);
      autoDetectPanel.appendChild(el('div', {class:'muted', style:'margin-top:12px;'}, ['Selected Word']));
      autoDetectPanel.appendChild(autoDetectSelected);

      mixedWrapPanel = el('div', {class:'card', style:'margin-top:10px; display:none;'});
      mixedWrapPanel.appendChild(el('h3', {}, ['Mixed Wrap Selection']));
      mixedWrapPanel.appendChild(el('p', {class:'muted'}, ['Choose which detected words should stay wrapped in phoneme tags.']));
      mixedWrapList = el('div', {class:'stack'});
      mixedWrapPanel.appendChild(mixedWrapList);
    }

    const runBtn = el('button', {class:'btn primary', type:'button'}, ['Analyze']);
    const btnClear = el('button', {class:'btn', type:'button'}, ['Clear']);
    let btnGenerateSsml = null;
    const btnDownload = el('button', {class:'btn', type:'button'}, ['Download Analysis JSON']);
    const btnLoad = el('button', {class:'btn', type:'button'}, ['Load Analysis JSON']);
    const fileLoad = el('input', {type:'file', accept:'application/json', class:'hidden'});

    btnLoad.addEventListener('click', ()=> fileLoad.click());

    const infoRow = el('div', {class:'row' + (modernSimpleLayout ? ' publicSimpleControls' : '')});
    infoRow.appendChild(runBtn);
    infoRow.appendChild(btnClear);
    infoRow.appendChild(joinSelect);
    infoRow.appendChild(traceCheck);
    infoRow.appendChild(renderLimitLabel);
    infoRow.appendChild(richLexiconControl.wrap);
    infoRow.appendChild(btnDownload);
    infoRow.appendChild(btnLoad);
    infoRow.appendChild(fileLoad);

    input.id = inputId;
    const inputBlock = el('div', {class: modernSimpleLayout ? 'publicSimpleFieldBlock' : ''});
    inputBlock.appendChild(el('label', {class:'publicDemoInputLabel', for:inputId}, ['Text To Analyze']));
    inputBlock.appendChild(input);
    inputBlock.appendChild(el('div', {class:'publicDemoHint'}, [
      el('span', {class:'muted'}, ['Tip: use a single word for a clean pronunciation card, or try a short phrase to compare multiple words side by side.'])
    ]));
    inputBlock.appendChild(el('div', {style:'margin-top:10px;'}));
    inputBlock.appendChild(infoRow);
    card.appendChild(inputBlock);

    let awsControlCard = null;
    let ssmlCard = null;
    if(includeAwsControls){
      btnGenerateSsml = el('button', {class:'btn primary', type:'button'}, ['Generate SSML']);

      awsControlCard = el('div', {class:'card'});
      awsControlCard.appendChild(el('h3', {}, ['AWS TTS Controls']));
      awsControlCard.appendChild(el('p', {class:'muted'}, ['Uses the selected rich lexicon (V4 or V5) for pronunciation mapping, then builds AWS-style SSML output without the insert-tooling and history sections.']));

      const awsTopRow = el('div', {class:'row', style:'gap:8px; flex-wrap:wrap;'});
      awsTopRow.appendChild(modeSelect);
      awsTopRow.appendChild(outputModeSelect);
      awsTopRow.appendChild(btnGenerateSsml);

      const awsFlagsRow = el('div', {class:'row', style:'margin-top:10px; gap:8px; flex-wrap:wrap;'});
      for(const pair of [
        ['Wrap In <speak>', speakInput],
        ['Empty Phoneme Body', emptyBodyInput],
        ['Preserve Punctuation', punctInput],
        ['Split Hyphen Parts', hyphenInput],
        ['Trim Non Final IPA h', trimNonFinalHInput],
        ['Remove Lower Articulation', removeLowerArticulationInput],
        ['Strict Missing', strictInput]
      ]){
        const label = el('label', {class:'checkbox'});
        label.appendChild(pair[1]);
        label.appendChild(document.createTextNode(pair[0]));
        awsFlagsRow.appendChild(label);
      }

      awsControlCard.appendChild(awsTopRow);
      awsControlCard.appendChild(awsFlagsRow);
      awsControlCard.appendChild(autoDetectRow);
      awsControlCard.appendChild(autoDetectPanel);
      awsControlCard.appendChild(mixedWrapPanel);

      ssmlCard = el('div', {class:'card'});
      ssmlCard.appendChild(el('h3', {}, ['SSML Output']));
      ssmlStatus = el('div', {class:'row'});
      ssmlStatus.appendChild(el('span', {class:'tag'}, ['Ready']));
      ssmlStatus.appendChild(el('span', {class:'muted'}, ['Run Analyze or Generate SSML to build output from the selected rich lexicon.']));
      ssmlCard.appendChild(ssmlStatus);

      ssmlOut = el('textarea', {rows:'6', class:'mono', 'aria-label':'Public simple SSML output'});
      ssmlCard.appendChild(ssmlOut);

      const ssmlBtnRow = el('div', {class:'row', style:'margin-top:10px; gap:8px;'});
      const btnCopySsmlOut = el('button', {class:'btn', type:'button'}, ['Copy SSML']);
      const btnDownloadSsml = el('button', {class:'btn', type:'button'}, ['Download SSML']);
      btnCopySsmlOut.addEventListener('click', ()=> copyToClipboard(String(ssmlOut.value || '')));
      btnDownloadSsml.addEventListener('click', ()=>{
        const stamp = new Date().toISOString().replaceAll(':','').replaceAll('.','');
        downloadText('public_demo_simple_ssml_' + stamp + '.txt', String(ssmlOut.value || ''), 'text/plain');
      });
      ssmlBtnRow.appendChild(btnCopySsmlOut);
      ssmlBtnRow.appendChild(btnDownloadSsml);
      ssmlCard.appendChild(ssmlBtnRow);

      ssmlMapWrap = el('div', {style:'margin-top:12px;'});
      ssmlTraceWrap = el('div', {style:'margin-top:12px;'});
      ssmlCard.appendChild(ssmlMapWrap);
      ssmlCard.appendChild(ssmlTraceWrap);

      if(includeAwsPlayback){
        playCard = el('div', {class:'card'});
        playCard.appendChild(el('h3', {}, ['AWS Polly Playback']));
        playCard.appendChild(el('p', {class:'muted'}, ['This runs in your browser using the AWS SDK. If the SDK fails to load or the browser blocks the call, you can still copy the generated SSML and run it with boto3.']));

        const playbackPrefs = loadG2pAwsTtsPrefs();
        const playbackCreds = loadG2pAwsTtsCreds();

        playbackServiceRegion = el('input', {type:'text', value: playbackPrefs.serviceRegion || 'australiaeast', placeholder:'service_region (reference)', 'aria-label':'Public simple service region'});
        playbackAwsRegion = el('input', {type:'text', value: playbackPrefs.awsRegion || 'ap-southeast-2', placeholder:'aws_region (e.g. ap-southeast-2)', 'aria-label':'Public simple AWS region'});
        playbackVoiceId = el('input', {type:'text', value: playbackPrefs.voiceId || 'Aria', placeholder:'VoiceId', 'aria-label':'Public simple VoiceId'});

        playbackEngine = el('select', {class:'btn', 'aria-label':'Public simple AWS engine'});
        playbackEngine.style.padding = '8px 10px';
        playbackEngine.style.borderRadius = '10px';
        playbackEngine.style.background = 'var(--surfaceStrong)';
        playbackEngine.style.border = '1px solid var(--border)';
        playbackEngine.style.color = 'var(--text)';
        for(const v of ['neural', 'standard']){
          const o = el('option', {value:v}, [v]);
          if(v === (playbackPrefs.engine || 'neural')) o.selected = true;
          playbackEngine.appendChild(o);
        }

        playbackLanguageCode = el('input', {type:'text', value: playbackPrefs.languageCode || 'en-NZ', placeholder:'LanguageCode (optional)', 'aria-label':'Public simple language code'});

        playbackOutputFormat = el('select', {class:'btn', 'aria-label':'Public simple output format'});
        playbackOutputFormat.style.padding = '8px 10px';
        playbackOutputFormat.style.borderRadius = '10px';
        playbackOutputFormat.style.background = 'var(--surfaceStrong)';
        playbackOutputFormat.style.border = '1px solid var(--border)';
        playbackOutputFormat.style.color = 'var(--text)';
        for(const v of ['mp3', 'ogg_vorbis', 'pcm']){
          const o = el('option', {value:v}, [v]);
          if(v === (playbackPrefs.outputFormat || 'mp3')) o.selected = true;
          playbackOutputFormat.appendChild(o);
        }

        playbackAccessKeyId = el('input', {type:'password', value: playbackCreds.accessKeyId || '', placeholder:'AWS Access Key Id', 'aria-label':'Public simple AWS access key id'});
        playbackSecretAccessKey = el('input', {type:'password', value: playbackCreds.secretAccessKey || '', placeholder:'AWS Secret Access Key', 'aria-label':'Public simple AWS secret access key'});
        playbackSessionToken = el('input', {type:'password', value: playbackCreds.sessionToken || '', placeholder:'AWS Session Token (optional)', 'aria-label':'Public simple AWS session token'});

        const rememberCheck = el('label', {class:'checkbox'});
        playbackRememberInput = el('input', {type:'checkbox', 'aria-label':'Remember AWS credentials in local storage'});
        playbackRememberInput.checked = !!playbackCreds.remember;
        rememberCheck.appendChild(playbackRememberInput);
        rememberCheck.appendChild(document.createTextNode('Remember Credentials (Local Storage)'));

        const btnSavePlaybackCfg = el('button', {class:'btn', type:'button'}, ['Save Config']);
        const btnPlaySsml = el('button', {class:'btn primary', type:'button'}, ['Play SSML']);
        const btnDownloadMp3 = el('button', {class:'btn', type:'button'}, ['Download MP3']);

        const advancedPlayback = el('details', {class:'tokenDetails', style:'margin-top:10px;'});
        advancedPlayback.appendChild(el('summary', {}, ['Advanced']));

        const advancedInner = el('div', {style:'margin-top:12px;'});
        const playbackGrid = el('div', {class:'twoCol'});
        playbackGrid.appendChild(el('div', {}, [el('h3', {}, ['Regions']), el('div', {class:'stack'}, [
          el('label', {}, ['service_region']), playbackServiceRegion,
          el('label', {}, ['aws_region']), playbackAwsRegion
        ])]));
        playbackGrid.appendChild(el('div', {}, [el('h3', {}, ['Voice']), el('div', {class:'stack'}, [
          el('label', {}, ['VoiceId']), playbackVoiceId,
          el('label', {}, ['Engine']), playbackEngine,
          el('label', {}, ['LanguageCode']), playbackLanguageCode,
          el('label', {}, ['OutputFormat']), playbackOutputFormat
        ])]));
        advancedInner.appendChild(playbackGrid);

        advancedInner.appendChild(el('h3', {}, ['Credentials']));
        advancedInner.appendChild(el('div', {class:'stack'}, [
          playbackAccessKeyId,
          playbackSecretAccessKey,
          playbackSessionToken,
          rememberCheck
        ]));

        const playbackAdvancedBtnRow = el('div', {class:'row', style:'margin-top:10px; gap:8px; flex-wrap:wrap;'});
        playbackAdvancedBtnRow.appendChild(btnSavePlaybackCfg);
        advancedInner.appendChild(playbackAdvancedBtnRow);

        const playbackBtnRow = el('div', {class:'row', style:'margin-top:10px; gap:8px; flex-wrap:wrap;'});
        playbackBtnRow.appendChild(btnPlaySsml);
        playbackBtnRow.appendChild(btnDownloadMp3);
        playCard.appendChild(playbackBtnRow);

        playbackAudio = el('audio', {controls:'', style:'width:100%; margin-top:10px;'});
        playbackTrace = el('pre', {class:'mono', style:'margin-top:10px; white-space:pre-wrap;'});
        playCard.appendChild(playbackAudio);
        advancedInner.appendChild(playbackTrace);
        advancedPlayback.appendChild(advancedInner);
        playCard.appendChild(advancedPlayback);

        btnSavePlaybackCfg.addEventListener('click', ()=>{
          saveG2pAwsTtsPrefs({
            ...loadG2pAwsTtsPrefs(),
            serviceRegion: String(playbackServiceRegion.value || '').trim(),
            awsRegion: String(playbackAwsRegion.value || '').trim(),
            voiceId: String(playbackVoiceId.value || '').trim(),
            engine: String(playbackEngine.value || 'neural'),
            languageCode: String(playbackLanguageCode.value || '').trim(),
            outputFormat: String(playbackOutputFormat.value || 'mp3')
          });

          if(playbackRememberInput && playbackRememberInput.checked){
            saveG2pAwsTtsCreds({
              remember: true,
              accessKeyId: playbackAccessKeyId.value,
              secretAccessKey: playbackSecretAccessKey.value,
              sessionToken: playbackSessionToken.value
            });
          } else {
            saveG2pAwsTtsCreds({remember:false});
          }

          if(playbackTrace) playbackTrace.textContent = 'Saved.';
        });

        btnDownloadMp3.addEventListener('click', ()=>{
          if(!playbackLastAudioBlob){
            if(playbackTrace) playbackTrace.textContent = 'No audio available. Click Play SSML first.';
            return;
          }
          _g2pAwsTtsDownloadBlob('public_demo_simple_aws_polly.mp3', playbackLastAudioBlob);
        });

        btnPlaySsml.addEventListener('click', async ()=>{ await playPublicSimpleSsml(); });
      }
    }

    const outWrap = el('div', {class:'stack', style:'margin-top:12px;'});

    root.appendChild(card);
    if(modernSimpleLayout) root.appendChild(outWrap);
    if(awsControlCard) root.appendChild(awsControlCard);
    if(ssmlCard) root.appendChild(ssmlCard);
    if(playCard) root.appendChild(playCard);
    if(!modernSimpleLayout) root.appendChild(outWrap);

    function renderEmptyState(){
      outWrap.innerHTML = '';
      const empty = el('div', {class:'card'});
      empty.appendChild(el('h2', {}, ['Ready To Analyze']));
      empty.appendChild(el('p', {}, [
        showExamples ? 'Choose one of the examples above or paste your own text. ' : 'Paste your own text to start the simplified pronunciation view. ',
        'This public demo focuses on the core pronunciation view only, so the output stops after Segment Mapping.'
      ]));
      if(showExamples){
        const row = el('div', {class:'row'});
        for(const example of PUBLIC_DEMO_EXAMPLES){
          const btn = el('button', {class:'btn', type:'button'}, [example.label]);
          btn.addEventListener('click', ()=>{
            input.value = example.value;
            saveToStorage(draftKey, input.value);
            runBtn.click();
          });
          row.appendChild(btn);
        }
        empty.appendChild(row);
      }
      outWrap.appendChild(empty);
    }

    function renderSummary(summary){
      const row = el('div', {class:'row'});
      row.appendChild(el('span', {class:'tag'}, ['words: ' + summary.wordCount]));
      row.appendChild(el('span', {class:'tag'}, ['rendered: ' + summary.rendered]));
      row.appendChild(el('span', {class:'tag'}, ['segments: ' + summary.segmentCount]));
      row.appendChild(el('span', {class:'tag'}, ['missing segments: ' + summary.missingSegmentCount]));
      row.appendChild(el('span', {class:'tag'}, ['unique segments used: ' + summary.uniqueSegmentCount]));
      return row;
    }

    function getPublicSimpleInputMode(){
      return modeSelect ? (modeSelect.value || 'text') : 'text';
    }

    function getPublicSimpleSplitHyphen(){
      return !!(hyphenInput && hyphenInput.checked);
    }

    function getPublicSimplePreservePunctuation(){
      return !!(punctInput && punctInput.checked);
    }

    function tokenizePublicDemoTextPreserve(text, splitHyphen){
      const t = String(text || '');
      const wordRe = splitHyphen ? /[A-Za-zÄ€ÄÄ’Ä“ÄªÄ«ÅŒÅÅªÅ«]+/g : /[A-Za-zÄ€ÄÄ’Ä“ÄªÄ«ÅŒÅÅªÅ«\-]+/g;
      const tokens = [];
      let last = 0;
      for(const m of t.matchAll(wordRe)){
        const i = m.index || 0;
        if(i > last) tokens.push({type:'sep', text: t.slice(last, i)});
        tokens.push({type:'word', text: m[0]});
        last = i + m[0].length;
      }
      if(last < t.length) tokens.push({type:'sep', text: t.slice(last)});
      return tokens;
    }

    function tokenizePublicDemoTextPreserve(text, splitHyphen){
      const t = String(text || '');
      const wordRe = splitHyphen ? /[A-Za-zĀāĒēĪīŌōŪū]+/g : /[A-Za-zĀāĒēĪīŌōŪū\-]+/g;
      const tokens = [];
      let last = 0;
      for(const m of t.matchAll(wordRe)){
        const i = m.index || 0;
        if(i > last) tokens.push({type:'sep', text: t.slice(last, i)});
        tokens.push({type:'word', text: m[0]});
        last = i + m[0].length;
      }
      if(last < t.length) tokens.push({type:'sep', text: t.slice(last)});
      return tokens;
    }

    function tokenizePublicDemoTextPreserve(text, splitHyphen){
      const t = String(text || '');
      const wordRe = splitHyphen
        ? /[A-Za-z\u0100\u0101\u0112\u0113\u012A\u012B\u014C\u014D\u016A\u016B]+/g
        : /[A-Za-z\u0100\u0101\u0112\u0113\u012A\u012B\u014C\u014D\u016A\u016B\-]+/g;
      const tokens = [];
      let last = 0;
      for(const m of t.matchAll(wordRe)){
        const i = m.index || 0;
        if(i > last) tokens.push({type:'sep', text: t.slice(last, i)});
        tokens.push({type:'word', text: m[0]});
        last = i + m[0].length;
      }
      if(last < t.length) tokens.push({type:'sep', text: t.slice(last)});
      return tokens;
    }

    function getPublicDemoAnalysisTokens(rawText){
      const raw = String(rawText || '');
      const mode = getPublicSimpleInputMode();
      if(mode === 'single'){
        const single = raw.trim();
        return single ? [{type:'word', text: single}] : [];
      }
      if(mode === 'list'){
        const items = raw.split(/[\n\r\t,;]+/g).map(x => x.trim()).filter(Boolean);
        const tokens = [];
        items.forEach((item, idx)=>{
          if(idx > 0) tokens.push({type:'sep', text:', '});
          tokens.push({type:'word', text:item});
        });
        return tokens;
      }
      if(includeAwsControls){
        return tokenizePublicDemoTextPreserve(raw, getPublicSimpleSplitHyphen());
      }
      return tokenizeTextBlockParts(raw).map(p => (
        p.type === 'word'
          ? {type:'word', text:p.raw}
          : {type:'sep', text:p.text || ''}
      ));
    }

    function getPublicDemoWordsForAnalysis(rawText){
      const words = [];
      for(const tok of getPublicDemoAnalysisTokens(rawText)){
        if(tok.type !== 'word') continue;
        words.push(tok.text);
      }
      return words;
    }

    function updateAwsControlVisibility(){
      if(!includeAwsControls) return;
      const mode = outputModeSelect ? (outputModeSelect.value || 'phoneme') : 'phoneme';
      autoDetectRow.style.display = mode === 'mixedAuto' ? '' : 'none';
      if(autoDetectPanel) autoDetectPanel.style.display = mode === 'mixedAuto' ? '' : 'none';
      mixedWrapPanel.style.display = mode === 'mixed' ? '' : 'none';
    }

    function normalizeMixedWrapKey(word, occurrenceIndex){
      return normalizeWord(word) + '::' + String(occurrenceIndex);
    }

    function autoDetectHash(rawText){
      return JSON.stringify({
        text: String(rawText || ''),
        mode: getPublicSimpleInputMode(),
        splitHyphen: getPublicSimpleSplitHyphen(),
        threshold: clamp01(parseFloat((autoThr && autoThr.value) || '0.75'))
      });
    }

    function syncPublicAutoDetectState(rawText){
      const nextHash = autoDetectHash(rawText);
      if(publicAutoDetectState.lastHash === nextHash) return;
      publicAutoDetectState.lastHash = nextHash;
      publicAutoDetectState.overrides = {};
      publicAutoDetectState.selectedKey = null;
    }

    function getPublicAutoOverride(key){
      if(!key) return null;
      if(!Object.prototype.hasOwnProperty.call(publicAutoDetectState.overrides, key)) return null;
      return !!publicAutoDetectState.overrides[key];
    }

    function setPublicAutoOverride(key, nextValue){
      if(!key) return;
      publicAutoDetectState.overrides[key] = !!nextValue;
    }

    function clearPublicAutoOverride(key){
      if(!key) return;
      delete publicAutoDetectState.overrides[key];
    }

    function publicAutoOverrideCount(){
      try { return Object.keys(publicAutoDetectState.overrides || {}).length; } catch(e){ return 0; }
    }

    function getAutoWrapMap(rawText){
      syncPublicAutoDetectState(rawText);
      const detect = computeDetectForStats(String(rawText || ''), clamp01(parseFloat((autoThr && autoThr.value) || '0.75')));
      const include = (detect && Array.isArray(detect.includeFinal)) ? detect.includeFinal : [];
      const wrapMap = {};
      let wordIndex = 0;
      for(const tok of getPublicDemoAnalysisTokens(rawText)){
        if(tok.type !== 'word') continue;
        const key = normalizeMixedWrapKey(tok.text, wordIndex);
        const override = getPublicAutoOverride(key);
        wrapMap[key] = override == null ? (include[wordIndex] === true) : override;
        wordIndex += 1;
      }
      return wrapMap;
    }

    function renderAutoDetectPreview(rawText){
      if(!includeAwsControls || !autoDetectSummary || !autoDetectHighlight || !autoDetectBlocks || !autoDetectTable || !autoDetectSelected) return;
      autoDetectSummary.innerHTML = '';
      autoDetectHighlight.innerHTML = '';
      autoDetectBlocks.innerHTML = '';
      autoDetectTable.innerHTML = '';
      autoDetectSelected.innerHTML = '';
      if(autoOverrideTag) autoOverrideTag.textContent = 'Overrides: ' + String(publicAutoOverrideCount());

      const mode = outputModeSelect ? (outputModeSelect.value || 'phoneme') : 'phoneme';
      if(mode !== 'mixedAuto'){
        autoDetectSummary.appendChild(el('span', {class:'muted'}, ['Switch to Mixed (Auto Detect Te Reo) to preview token decisions.']));
        return;
      }

      const tokens = getPublicDemoAnalysisTokens(rawText);
      const words = tokens.filter(tok => tok.type === 'word');
      if(!words.length){
        autoDetectSummary.appendChild(el('span', {class:'tag bad'}, ['No Text']));
        autoDetectSummary.appendChild(el('span', {class:'muted'}, ['Enter text above to review likely te reo tokens.']));
        return;
      }

      syncPublicAutoDetectState(rawText);
      autoDetectSummary.appendChild(el('div', {class:'muted'}, ['Included tokens show a subtle dot. Click a token to inspect details. Shift-click a token to toggle processing for that token. Manual overrides show Override.']));

      const detect = computeDetectForStats(String(rawText || ''), clamp01(parseFloat((autoThr && autoThr.value) || '0.75')));
      const scored = (detect && Array.isArray(detect.scored)) ? detect.scored : [];
      const wrapMap = getAutoWrapMap(rawText);
      let includeCount = 0;
      const tokenSpans = [];
      let wordIndex = 0;
      for(const tok of tokens){
        if(tok.type !== 'word'){
          autoDetectHighlight.appendChild(document.createTextNode(String(tok.text || '')));
          continue;
        }
        const scoredTok = scored[wordIndex] || { raw: tok.text, score: 0, signals: [], norm: normalizeWord(tok.text), key: normalizeMixedWrapKey(tok.text, wordIndex) };
        const key = normalizeMixedWrapKey(tok.text, wordIndex);
        const included = wrapMap[key] === true;
        if(included) includeCount += 1;
        const label = scoreToLabel(scoredTok.score || 0);
        const hasOverride = getPublicAutoOverride(key) != null;
        const span = el('span', {
          class:'hlTok ' + label.cls + (included ? ' inc' : '') + (hasOverride ? ' ovr' : ''),
          tabindex:'0',
          'data-key': key
        }, [String(tok.text || '')]);
        span.addEventListener('click', (ev)=>{
          if(ev && ev.shiftKey){
            setPublicAutoOverride(key, !included);
            publicAutoDetectState.selectedKey = key;
            generateAwsSsmlFromCurrent();
            return;
          }
          publicAutoDetectState.selectedKey = key;
          renderAutoDetectPreview(String(input.value || ''));
        });
        tokenSpans.push({ key, span });
        autoDetectHighlight.appendChild(span);
        wordIndex += 1;
      }

      const counts = el('div', {class:'row', style:'margin-top:8px; flex-wrap:wrap; gap:8px;'});
      counts.appendChild(el('span', {class:'tag'}, ['tokens: ' + String(words.length)]));
      counts.appendChild(el('span', {class:'tag good'}, ['include: ' + String(includeCount)]));
      counts.appendChild(el('span', {class:'tag'}, ['plain: ' + String(words.length - includeCount)]));
      autoDetectSummary.appendChild(counts);

      let currentBlock = null;
      let blockIndex = 0;
      for(let i=0; i<words.length; i++){
        const key = normalizeMixedWrapKey(words[i].text, i);
        const included = wrapMap[key] === true;
        if(included){
          if(!currentBlock) currentBlock = { start: i, end: i, words: [String(words[i].text || '')] };
          else {
            currentBlock.end = i;
            currentBlock.words.push(String(words[i].text || ''));
          }
        } else if(currentBlock){
          blockIndex += 1;
          const item = el('div', {style:'display:flex; gap:8px; align-items:center;'});
          item.appendChild(el('span', {class:'tag good'}, ['Block ' + String(blockIndex) + ': #' + String(currentBlock.start + 1) + ' to #' + String(currentBlock.end + 1)]));
          item.appendChild(el('span', {class:'mono'}, [currentBlock.words.join(' ')]));
          autoDetectBlocks.appendChild(item);
          currentBlock = null;
        }
      }
      if(currentBlock){
        blockIndex += 1;
        const item = el('div', {style:'display:flex; gap:8px; align-items:center;'});
        item.appendChild(el('span', {class:'tag good'}, ['Block ' + String(blockIndex) + ': #' + String(currentBlock.start + 1) + ' to #' + String(currentBlock.end + 1)]));
        item.appendChild(el('span', {class:'mono'}, [currentBlock.words.join(' ')]));
        autoDetectBlocks.appendChild(item);
      }
      if(!blockIndex){
        autoDetectBlocks.appendChild(el('span', {class:'tag'}, ['No Te Reo blocks detected']));
      }

      const thead = el('thead');
      thead.appendChild(el('tr', {}, [
        el('th', {}, ['#']),
        el('th', {}, ['Word']),
        el('th', {}, ['Score']),
        el('th', {}, ['Process']),
        el('th', {}, ['Signals'])
      ]));
      autoDetectTable.appendChild(thead);

      const tbody = el('tbody');
      for(let i=0; i<words.length; i++){
        const scoredTok = scored[i] || { raw: words[i].text, score: 0, signals: [], norm: normalizeWord(words[i].text), key: normalizeMixedWrapKey(words[i].text, i) };
        const key = normalizeMixedWrapKey(words[i].text, i);
        const included = wrapMap[key] === true;
        const procCell = el('td', {});
        const cb = el('input', {type:'checkbox', title:'Toggle processing for this token'});
        cb.checked = included;
        cb.addEventListener('click', (ev)=>{ ev.stopPropagation(); });
        cb.addEventListener('change', ()=>{
          setPublicAutoOverride(key, !!cb.checked);
          publicAutoDetectState.selectedKey = key;
          generateAwsSsmlFromCurrent();
        });
        procCell.appendChild(cb);
        if(getPublicAutoOverride(key) != null){
          procCell.appendChild(el('span', {class:'tag', style:'margin-left:6px;'}, ['Override']));
        }
        const tr = el('tr', {style:'cursor:pointer;'}, [
          el('td', {class:'mono'}, [String(i + 1)]),
          el('td', {class:'mono'}, [String(words[i].text || '')]),
          el('td', {}, [el('span', {class:'tag ' + scoreToLabel(scoredTok.score || 0).cls}, [Math.round((scoredTok.score || 0) * 100) + '%'])]),
          procCell,
          el('td', {}, [renderSignalPills(scoredTok.signals || [])])
        ]);
        tr.addEventListener('click', ()=>{
          publicAutoDetectState.selectedKey = key;
          renderAutoDetectPreview(String(input.value || ''));
        });
        tbody.appendChild(tr);
      }
      autoDetectTable.appendChild(tbody);

      function selectAutoTokenByKey(key){
        if(!key) return;
        const idx = words.findIndex((tok, i) => normalizeMixedWrapKey(tok.text, i) === key);
        if(idx < 0) return;
        for(const item of tokenSpans){
          item.span.classList.toggle('sel', item.key === key);
        }
        const scoredTok = scored[idx] || { raw: words[idx].text, score: 0, signals: [], norm: normalizeWord(words[idx].text), key };
        const included = wrapMap[key] === true;
        autoDetectSelected.innerHTML = '';
        autoDetectSelected.appendChild(el('div', {class:'row'}, [
          el('span', {class:'tag ' + scoreToLabel(scoredTok.score || 0).cls}, [scoreToLabel(scoredTok.score || 0).label]),
          included ? el('span', {class:'tag good'}, ['Included']) : el('span', {class:'tag'}, ['Not Included']),
          el('span', {class:'mono'}, [String(words[idx].text || '')])
        ]));

        const overrideRow = el('div', {class:'row', style:'margin-top:8px; align-items:center;'});
        const overrideBox = el('input', {type:'checkbox', title:'Toggle whether this token is processed as te reo'});
        overrideBox.checked = included;
        overrideBox.addEventListener('change', ()=>{
          setPublicAutoOverride(key, !!overrideBox.checked);
          publicAutoDetectState.selectedKey = key;
          generateAwsSsmlFromCurrent();
        });
        overrideRow.appendChild(overrideBox);
        overrideRow.appendChild(el('span', {class:'muted'}, ['Process as Te Reo (Wrap In phoneme)']));
        if(getPublicAutoOverride(key) != null){
          const clearBtn = el('button', {class:'btn', type:'button', style:'padding:6px 10px; margin-left:8px;'}, ['Clear']);
          clearBtn.addEventListener('click', ()=>{
            clearPublicAutoOverride(key);
            publicAutoDetectState.selectedKey = key;
            generateAwsSsmlFromCurrent();
          });
          overrideRow.appendChild(el('span', {class:'tag', style:'margin-left:8px;'}, ['Override']));
          overrideRow.appendChild(clearBtn);
        } else {
          overrideRow.appendChild(el('span', {class:'tag', style:'margin-left:8px; opacity:.8;'}, ['Auto']));
        }
        autoDetectSelected.appendChild(overrideRow);

        const info = el('div', {style:'margin-top:8px;'});
        info.appendChild(el('div', {class:'muted'}, ['Normalized']));
        info.appendChild(el('div', {class:'mono'}, [String(scoredTok.norm || normalizeWord(words[idx].text || ''))]));
        info.appendChild(el('div', {class:'muted', style:'margin-top:8px;'}, ['Signals']));
        info.appendChild(renderSignalPills(scoredTok.signals || []));
        if(autoDebugInput && autoDebugInput.checked){
          info.appendChild(el('div', {class:'muted', style:'margin-top:8px;'}, ['Debug']));
          info.appendChild(el('pre', {class:'mono', style:'white-space:pre-wrap;'}, [
            JSON.stringify({
              base: scoredTok.base,
              contextDelta: scoredTok.contextDelta,
              contextNotes: scoredTok.contextNotes,
              debug: scoredTok.debug
            }, null, 2)
          ]));
        }
        autoDetectSelected.appendChild(info);
      }

      let selectedKey = publicAutoDetectState.selectedKey;
      if(!selectedKey || !words.some((tok, i) => normalizeMixedWrapKey(tok.text, i) === selectedKey)){
        const firstIncludedIndex = words.findIndex((tok, i) => wrapMap[normalizeMixedWrapKey(tok.text, i)] === true);
        selectedKey = normalizeMixedWrapKey(words[(firstIncludedIndex >= 0 ? firstIncludedIndex : 0)].text, (firstIncludedIndex >= 0 ? firstIncludedIndex : 0));
      }
      publicAutoDetectState.selectedKey = selectedKey;
      selectAutoTokenByKey(selectedKey);
    }

    function trimPublicDemoIpa(wordObjOrIpa){
      const fallback = (wordObjOrIpa && typeof wordObjOrIpa === 'object')
        ? String(wordObjOrIpa.ipa || '')
        : String(wordObjOrIpa || '');
      if(!trimNonFinalHInput || !trimNonFinalHInput.checked) return fallback;
      const parts = (wordObjOrIpa && typeof wordObjOrIpa === 'object' && Array.isArray(wordObjOrIpa.ipaParts))
        ? wordObjOrIpa.ipaParts.map(part => String(part || ''))
        : null;
      if(!parts || !parts.length) return fallback;
      const trimmedParts = parts.map((part, idx)=>{
        if(idx >= (parts.length - 1)) return part;
        return part.replace(/h(\.+)?$/, (m, dots)=> (dots ?? ''));
      });
      return joinIpa(trimmedParts, joinSelect ? (joinSelect.value || 'space') : 'space');
    }

    function applyPublicSimpleSsmlIpaFilters(ipa){
      let out = String(ipa || '');
      if(removeLowerArticulationInput && removeLowerArticulationInput.checked){
        out = stripLowerArticulationFromIpa(out);
      }
      return out;
    }

    function buildPublicDemoPhoneme(wordObj){
      const word = String((wordObj && (wordObj.word || wordObj.wordNorm)) || '');
      const rows = (wordObj && Array.isArray(wordObj.rows)) ? wordObj.rows : [];
      const hasMissing = rows.some(r => r && r.status === 'missing');
      if(strictInput && strictInput.checked && hasMissing) return escapeHtml(word);
      const ipa = applyPublicSimpleSsmlIpaFilters(trimPublicDemoIpa(wordObj));
      if(!ipa) return escapeHtml(word);
      const body = (emptyBodyInput && emptyBodyInput.checked) ? '' : escapeHtml(word);
      return '<phoneme alphabet="ipa" ph="' + ipa + '">' + body + '</phoneme>';
    }

    async function playPublicSimpleSsml(ssmlValue){
      if(playbackTrace) playbackTrace.textContent = '';
      let ssml = String(ssmlValue || '').trim();
      if(!ssml && ssmlOut) ssml = String(ssmlOut.value || '').trim();
      if(!ssml){
        if(playbackTrace) playbackTrace.textContent = 'No SSML to play. Generate or analyze first.';
        return;
      }
      if(!/^<speak[\s>]/i.test(ssml)) ssml = '<speak>' + ssml + '</speak>';
      if(typeof AWS === 'undefined' || !AWS || !AWS.Polly){
        if(playbackTrace) playbackTrace.textContent = 'AWS SDK not available. Check that the script loaded.';
        return;
      }
      const ak = String((playbackAccessKeyId && playbackAccessKeyId.value) || '').trim();
      const sk = String((playbackSecretAccessKey && playbackSecretAccessKey.value) || '').trim();
      if(!ak || !sk){
        if(playbackTrace) playbackTrace.textContent = 'Missing AWS credentials.';
        return;
      }
      try{
        AWS.config.region = playbackAwsRegion.value;
        AWS.config.credentials = new AWS.Credentials({
          accessKeyId: ak,
          secretAccessKey: sk,
          sessionToken: String((playbackSessionToken && playbackSessionToken.value) || '').trim() || undefined
        });

        const params = {
          Text: ssml,
          OutputFormat: String((playbackOutputFormat && playbackOutputFormat.value) || 'mp3'),
          VoiceId: String((playbackVoiceId && playbackVoiceId.value) || 'Aria'),
          TextType: 'ssml',
          Engine: String((playbackEngine && playbackEngine.value) || 'neural')
        };
        const lc = String((playbackLanguageCode && playbackLanguageCode.value) || '').trim();
        if(lc) params.LanguageCode = lc;

        if(playbackTrace) playbackTrace.textContent = JSON.stringify({params}, null, 2);

        const polly = new AWS.Polly({apiVersion:'2016-06-10', region: playbackAwsRegion.value});
        const data = await polly.synthesizeSpeech(params).promise();
        if(!data || !data.AudioStream){
          if(playbackTrace) playbackTrace.textContent += '\n\nNo audio stream in response.';
          return;
        }

        let blob;
        const stream = data.AudioStream;
        if(stream instanceof ArrayBuffer) blob = new Blob([stream], {type:'audio/mpeg'});
        else if(stream && stream.buffer) blob = new Blob([stream.buffer], {type:'audio/mpeg'});
        else blob = new Blob([stream], {type:'audio/mpeg'});

        playbackLastAudioBlob = blob;
        if(playbackAudio){
          playbackAudio.src = URL.createObjectURL(blob);
          await playbackAudio.play();
        }
      } catch(e){
        if(playbackTrace){
          playbackTrace.textContent = 'Error: ' + String(e && e.message ? e.message : e) + '\n\n' +
            'Boto3 params reference:\n' +
            "Text=ssml, OutputFormat='mp3', VoiceId='Aria', TextType='ssml', LanguageCode='en-NZ', Engine='neural'";
        }
      }
    }

    function buildPublicDemoPlainText(rawText){
      const tokens = getPublicDemoAnalysisTokens(rawText);
      if(getPublicSimpleInputMode() === 'text' && getPublicSimplePreservePunctuation()){
        return tokens.map(tok => escapeHtml(tok.text || '')).join('');
      }
      const words = tokens.filter(tok => tok.type === 'word').map(tok => escapeHtml(tok.text || ''));
      return getPublicSimpleInputMode() === 'list' ? words.join(', ') : words.join(' ');
    }

    function redrawMixedWrapList(analysis){
      if(!includeAwsControls || !mixedWrapList) return;
      mixedWrapList.innerHTML = '';
      const words = (analysis && Array.isArray(analysis.words)) ? analysis.words : [];
      if(!words.length){
        mixedWrapList.appendChild(el('p', {class:'muted'}, ['Run Analyze first to choose wrapped words.']));
        return;
      }
      for(let i=0; i<words.length; i++){
        const wordObj = words[i];
        const key = normalizeMixedWrapKey(wordObj.word || wordObj.wordNorm, i);
        if(publicMixedWrap[key] === undefined) publicMixedWrap[key] = true;
        const row = el('label', {class:'checkbox'});
        const box = el('input', {type:'checkbox', 'aria-label':'Wrap ' + String(wordObj.word || wordObj.wordNorm || '') + ' in phoneme tags'});
        box.checked = publicMixedWrap[key] !== false;
        box.addEventListener('change', ()=>{
          publicMixedWrap[key] = !!box.checked;
          generateAwsSsmlFromCurrent();
        });
        row.appendChild(box);
        row.appendChild(document.createTextNode(String(wordObj.word || wordObj.wordNorm || '')));
        mixedWrapList.appendChild(row);
      }
    }

    function saveAwsControlPrefs(){
      if(!includeAwsControls) return;
      saveG2pAwsTtsPrefs({
        ...loadG2pAwsTtsPrefs(),
        inputMode: getPublicSimpleInputMode(),
        joinMode: joinSelect.value,
        outputMode: outputModeSelect ? (outputModeSelect.value || 'phoneme') : 'phoneme',
        wrapSpeak: !!(speakInput && speakInput.checked),
        emptyPhonemeBody: !!(emptyBodyInput && emptyBodyInput.checked),
        preservePunct: !!(punctInput && punctInput.checked),
        splitHyphen: !!(hyphenInput && hyphenInput.checked),
        trimNonFinalH: !!(trimNonFinalHInput && trimNonFinalHInput.checked),
        removeLowerArticulation: !!(removeLowerArticulationInput && removeLowerArticulationInput.checked),
        strictMissing: !!(strictInput && strictInput.checked),
        autoDetectThreshold: clamp01(parseFloat((autoThr && autoThr.value) || '0.75')),
        autoDetectShowDebug: !!(autoDebugInput && autoDebugInput.checked),
        mixedWrap: publicMixedWrap
      });
    }

    function generateAwsSsmlFromCurrent(){
      if(!includeAwsControls || !ssmlOut) return;
      const analysis = lastAnalysis;
      if(!analysis || !Array.isArray(analysis.words)){
        ssmlStatus.innerHTML = '';
        ssmlStatus.appendChild(el('span', {class:'tag bad'}, ['No Analysis']));
        ssmlStatus.appendChild(el('span', {class:'muted'}, ['Run Analyze first so the selected rich-lexicon pronunciation data is available.']));
        ssmlOut.value = '';
        renderAutoDetectPreview(String(input.value || ''));
        if(ssmlMapWrap) ssmlMapWrap.innerHTML = '';
        if(ssmlTraceWrap) ssmlTraceWrap.innerHTML = '';
        redrawMixedWrapList(null);
        return;
      }

      updateAwsControlVisibility();
      renderAutoDetectPreview(String(input.value || ''));
      redrawMixedWrapList(analysis);
      saveAwsControlPrefs();

      const outputMode = outputModeSelect ? (outputModeSelect.value || 'phoneme') : 'phoneme';
      const rawText = String(input.value || '');
      const tokens = getPublicDemoAnalysisTokens(rawText);
      const analysisWords = analysis.words || [];
      const autoWrapMap = outputMode === 'mixedAuto' ? getAutoWrapMap(rawText) : {};

      let ssmlBody = '';
      let wordIndex = 0;
      const mappedRows = [];

      if(outputMode === 'plain'){
        ssmlBody = buildPublicDemoPlainText(rawText);
      } else {
        for(const tok of tokens){
          if(tok.type === 'sep'){
            ssmlBody += escapeHtml(tok.text || '');
            continue;
          }
          const wordObj = analysisWords[wordIndex];
          const key = normalizeMixedWrapKey(tok.text, wordIndex);
          let shouldWrap = true;
          if(outputMode === 'mixedAuto') shouldWrap = autoWrapMap[key] === true;
          if(outputMode === 'mixed') shouldWrap = publicMixedWrap[key] !== false;
          const piece = shouldWrap ? buildPublicDemoPhoneme(wordObj) : escapeHtml(tok.text || '');
          ssmlBody += piece;
          if(wordObj){
            mappedRows.push({
              word: String(wordObj.word || tok.text || ''),
              segments: joinPartsPlus(wordObj.segments || []),
              ipa: trimPublicDemoIpa(wordObj),
              ssml: piece
            });
          }
          wordIndex += 1;
        }
      }

      ssmlOut.value = (speakInput && speakInput.checked) ? ('<speak>' + ssmlBody + '</speak>') : ssmlBody;

      ssmlStatus.innerHTML = '';
      ssmlStatus.appendChild(el('span', {class:'tag good'}, ['Ready']));
      ssmlStatus.appendChild(el('span', {class:'tag'}, ['mode: ' + getPublicSimpleInputMode()]));
      ssmlStatus.appendChild(el('span', {class:'tag'}, ['output: ' + outputMode]));

      if(ssmlMapWrap){
        ssmlMapWrap.innerHTML = '';
        if(mappedRows.length){
          const t = el('table', {class:'table'});
          const thead = el('thead');
          thead.appendChild(el('tr', {}, [
            el('th', {}, ['Word']),
            el('th', {}, ['Segments']),
            el('th', {}, ['IPA']),
            el('th', {}, ['SSML'])
          ]));
          t.appendChild(thead);
          const tbody = el('tbody');
          for(const row of mappedRows){
            tbody.appendChild(el('tr', {}, [
              el('td', {class:'mono'}, [row.word]),
              el('td', {class:'mono'}, [row.segments]),
              el('td', {class:'mono'}, [row.ipa]),
              el('td', {class:'mono'}, [row.ssml])
            ]));
          }
          t.appendChild(tbody);
          ssmlMapWrap.appendChild(t);
        } else {
          ssmlMapWrap.appendChild(el('p', {class:'muted'}, ['Plain output mode leaves the text unwrapped, so there are no phoneme rows to show.']));
        }
      }

      if(ssmlTraceWrap){
        ssmlTraceWrap.innerHTML = '';
        if(traceInput.checked){
          const lines = [
            'inputMode: ' + getPublicSimpleInputMode(),
            'joinMode: ' + joinSelect.value,
            'outputMode: ' + outputMode,
            'wrapSpeak: ' + !!(speakInput && speakInput.checked),
            'emptyPhonemeBody: ' + !!(emptyBodyInput && emptyBodyInput.checked),
            'preservePunct: ' + !!(punctInput && punctInput.checked),
            'splitHyphen: ' + !!(hyphenInput && hyphenInput.checked),
            'trimNonFinalH: ' + !!(trimNonFinalHInput && trimNonFinalHInput.checked),
            'removeLowerArticulation: ' + !!(removeLowerArticulationInput && removeLowerArticulationInput.checked),
            'strictMissing: ' + !!(strictInput && strictInput.checked)
          ];
          if(outputMode === 'mixedAuto'){
            lines.push('autoDetectThreshold: ' + Math.round(clamp01(parseFloat((autoThr && autoThr.value) || '0.75')) * 100) + '%');
          }
          ssmlTraceWrap.appendChild(el('pre', {class:'mono', style:'white-space:pre-wrap;'}, [lines.join('\n')]));
        }
      }
    }

    function buildWordCard(wordObj, wordIndex){
      const wordCard = el('div', {class:'card'});
      if(modernSimpleLayout) wordCard.classList.add('publicSimpleWordCard');
      const segs = wordObj.segments || [];
      const rows = wordObj.rows || [];
      const missing = rows.filter(r => r.status === 'missing').length;

      const headerRow = el('div', {class:'row'});
      if(modernSimpleLayout) headerRow.classList.add('publicSimpleMeta');
      headerRow.appendChild(el('span', {class:'tag'}, ['word: ' + (wordObj.word || wordObj.wordNorm || '')]));
      headerRow.appendChild(el('span', {class:'tag'}, ['segments: ' + segs.length]));
      if(missing) headerRow.appendChild(el('span', {class:'tag bad'}, ['missing: ' + missing]));
      wordCard.appendChild(headerRow);

      const englishAssistParts = computeEnglishAssistPartsForWord(wordObj);
      const phoneticParts = (wordObj.phoneticParts || []).map(x => String(x || '(N/A)'));
      const segmentsLine = joinPartsPlus(segs);
      const phoneticLine = joinPartsPlus(phoneticParts);
      const englishAssistLine = joinPartsPlus(englishAssistParts);

      const ssml = wordObj.ssml || '';
      const ipa = wordObj.ipa || '';

      function labeled(label, value, id){
        const wrap = el('div', {style:'margin-bottom:10px;'});
        wrap.appendChild(el('div', {class:'muted'}, [label]));
        const pre = el('pre', {class:'mono'});
        if(id) pre.id = id;
        pre.textContent = value || '';
        wrap.appendChild(pre);
        return wrap;
      }

      const btnRow = el('div', {class:'row'});
      if(modernSimpleLayout) btnRow.classList.add('publicSimpleActionBar');
      const btnPlaySsmlInline = includeAwsPlayback ? el('button', {class:'btn', type:'button'}, ['Play']) : null;
      const btnCopySsml = el('button', {class:'btn', type:'button'}, ['Copy SSML']);
      const btnCopyEng = el('button', {class:'btn', type:'button'}, ['Copy English Assist']);
      const btnRegen = el('button', {class:'btn', type:'button'}, ['Regenerate English Assist']);
      if(btnPlaySsmlInline) btnRow.appendChild(btnPlaySsmlInline);
      btnRow.appendChild(btnCopySsml);
      btnRow.appendChild(btnCopyEng);
      btnRow.appendChild(btnRegen);

      let sectionHost = wordCard;
      if(modernSimpleLayout){
        const outputGroup = el('div', {class:'publicSimpleOutputGroup'});
        outputGroup.appendChild(el('h3', {}, ['Outputs']));
        const outputGrid = el('div', {class:'publicSimpleOutputGrid'});
        outputGrid.appendChild(labeled('Word', String(wordObj.word || '')));
        outputGrid.appendChild(labeled('Segments', segmentsLine));
        outputGrid.appendChild(labeled('Combination amo manual', phoneticLine, idPrefix + 'Phonetic_' + wordIndex));
        outputGrid.appendChild(labeled('IPA', ipa, idPrefix + 'Ipa_' + wordIndex));
        outputGrid.appendChild(labeled('IPA SSML Output', ssml, idPrefix + 'Ssml_' + wordIndex));
        outputGrid.appendChild(labeled('English Assist', englishAssistLine, idPrefix + 'Eng_' + wordIndex));
        outputGroup.appendChild(outputGrid);
        outputGroup.appendChild(btnRow);
        wordCard.appendChild(outputGroup);
        sectionHost = outputGroup;
      } else {
        const block = el('div', {class:(singleColumnDetails ? 'stack' : 'twoCol'), style:'margin-top:10px;'});
        const left = el('div');
        const right = el('div');
        left.appendChild(labeled('Word', String(wordObj.word || '')));
        left.appendChild(labeled('Segments', segmentsLine));
        left.appendChild(labeled('Combination amo manual', phoneticLine, idPrefix + 'Phonetic_' + wordIndex));
        right.appendChild(labeled('IPA', ipa, idPrefix + 'Ipa_' + wordIndex));
        right.appendChild(labeled('IPA SSML Output', ssml, idPrefix + 'Ssml_' + wordIndex));
        right.appendChild(labeled('English Assist', englishAssistLine, idPrefix + 'Eng_' + wordIndex));
        block.appendChild(left);
        block.appendChild(right);
        wordCard.appendChild(block);
        wordCard.appendChild(btnRow);
      }

      if(btnPlaySsmlInline){
        btnPlaySsmlInline.addEventListener('click', async ()=>{ await playPublicSimpleSsml(); });
      }
      btnCopySsml.addEventListener('click', ()=> copyToClipboard(ssml || ''));
      btnCopyEng.addEventListener('click', ()=> {
        const line = joinPartsPlus(computeEnglishAssistPartsForWord(wordObj));
        copyToClipboard(line);
      });

      const detail = el('div', {style:'margin-top:12px;'});
      sectionHost.appendChild(detail);

      function redrawEnglish(){
        const engParts = computeEnglishAssistPartsForWord(wordObj);
        const engLine = joinPartsPlus(engParts);
        const engPre = wordCard.querySelector('#' + idPrefix + 'Eng_' + wordIndex);
        if(engPre) engPre.textContent = engLine;

        const tds = wordCard.querySelectorAll('td[data-eng-idx]');
        for(const td of tds){
          const idx = Number(td.getAttribute('data-eng-idx'));
          const r = rows[idx];
          const vars = (r && r.variants) ? r.variants : [];
          if(!vars.length) td.textContent = '(N/A)';
          else {
            const i = (wordObj.engIdxs && typeof wordObj.engIdxs[idx] === 'number') ? wordObj.engIdxs[idx] : 0;
            td.textContent = vars[i % vars.length] || '(N/A)';
          }
        }
      }

      btnRegen.addEventListener('click', ()=>{
        for(let i=0;i<rows.length;i++) {
          const r = rows[i];
          const vars = r.variants || [];
          if(vars.length) wordObj.engIdxs[i] = (wordObj.engIdxs[i] || 0) + 1;
        }
        redrawEnglish();
      });

      const tbl = el('table');
      const thead = el('thead');
      thead.appendChild(el('tr', {}, [
        el('th', {}, ['Segment']),
        el('th', {}, ['Status']),
        el('th', {}, ['ID']),
        el('th', {}, ['Unit']),
        el('th', {}, ['Proper IPA']),
        el('th', {}, ['Phonetic']),
        el('th', {}, ['English Assist']),
        el('th', {}, ['Variants'])
      ]));
      tbl.appendChild(thead);
      const tbody = el('tbody');

      function showSegmentDetail(segIndex){
        detail.innerHTML = '';
        const r = rows[segIndex];
        if(!r) return;

        const d = el('div', {class:'card', style:'background:var(--surfaceTable);'});
        d.appendChild(el('h3', {}, ['Segment Detail']));
        d.appendChild(el('p', {class:'muted'}, ['Unit: ' + (r.chosenUnit || r.segment || '') + '   ID: ' + (r.chosenId == null ? '' : String(r.chosenId)) ]));

        const variants = r.vars || [];
        if(!variants.length){
          d.appendChild(el('p', {class:'muted'}, ['No variations found for this segment in V4.']));
          detail.appendChild(d);
          return;
        }

        const t = el('table');
        const th = el('thead');
        th.appendChild(el('tr', {}, [
          el('th', {}, ['Version']),
          el('th', {}, ['Full Word Bracket Assist']),
          el('th', {}, ['Just Part']),
          el('th', {}, ['Use'])
        ]));
        t.appendChild(th);
        const tb = el('tbody');

        const engVars = r.variants || [];
        for(const v of variants){
          const br = v.bracket || '';
          const jp = v.just_part || '';
          const tr = el('tr');
          tr.appendChild(el('td', {class:'mono'}, [v.label || '']));
          tr.appendChild(el('td', {class:'mono'}, [br || '']));
          tr.appendChild(el('td', {class:'mono'}, [jp || '']));
          const btnCell = el('td');
          if(br && engVars.length){
            const useBtn = el('button', {class:'btn', type:'button'}, ['Use']);
            useBtn.addEventListener('click', ()=>{
              const ix = engVars.indexOf(br);
              if(ix >= 0) wordObj.engIdxs[segIndex] = ix;
              redrawEnglish();
            });
            btnCell.appendChild(useBtn);
          } else {
            btnCell.appendChild(el('span', {class:'muted'}, ['(N/A)']));
          }
          tr.appendChild(btnCell);
          tb.appendChild(tr);
        }
        t.appendChild(tb);
        d.appendChild(t);
        detail.appendChild(d);
      }

      for(let i=0;i<rows.length;i++) {
        const r = rows[i];
        const tr = el('tr');
        tr.style.cursor = 'pointer';
        tr.addEventListener('click', ()=> showSegmentDetail(i));

        const statusTag = r.status === 'match' ? 'good' : 'bad';
        tr.appendChild(el('td', {class:'mono'}, [r.segment]));
        tr.appendChild(el('td', {}, [el('span', {class:'tag ' + statusTag}, [r.status])]));
        tr.appendChild(el('td', {class:'mono'}, [r.chosenId == null ? '' : String(r.chosenId)]));
        tr.appendChild(el('td', {class:'mono'}, [r.chosenUnit || '']));
        tr.appendChild(el('td', {class:'mono'}, [r.chosenIpa || '']));
        tr.appendChild(el('td', {class:'mono'}, [r.chosenPhonetic || '']));
        const engTd = el('td', {class:'mono'}, ['']);
        engTd.setAttribute('data-eng-idx', String(i));
        tr.appendChild(engTd);
        tr.appendChild(el('td', {class:'mono'}, [String((r.variants || []).length)]));
        tbody.appendChild(tr);
      }
      tbl.appendChild(tbody);
      if(collapsibleSegmentMapping){
        const mappingDetails = el('details', {class:'tokenDetails'});
        mappingDetails.appendChild(el('summary', {}, ['Segment Mapping']));
        mappingDetails.appendChild(tbl);
        if(modernSimpleLayout){
          const mappingWrap = el('div', {class:'publicSimpleMappingWrap'});
          mappingWrap.appendChild(mappingDetails);
          sectionHost.appendChild(mappingWrap);
        } else {
          wordCard.appendChild(mappingDetails);
        }
      } else {
        if(modernSimpleLayout){
          const mappingWrap = el('div', {class:'publicSimpleMappingWrap'});
          mappingWrap.appendChild(el('h3', {style:'margin-top:0;'}, ['Segment Mapping']));
          mappingWrap.appendChild(tbl);
          sectionHost.appendChild(mappingWrap);
        } else {
          wordCard.appendChild(el('h3', {style:'margin-top:12px;'}, ['Segment Mapping']));
          wordCard.appendChild(tbl);
        }
      }

      redrawEnglish();
      return wordCard;
    }

    function renderAnalysis(analysis){
      outWrap.innerHTML = '';
      if(!analysis) return;

      if(showSummary){
        const summaryCard = el('div', {class:'card'});
        summaryCard.appendChild(el('h2', {}, ['Analysis Summary']));
        summaryCard.appendChild(renderSummary(analysis.summary));
        summaryCard.appendChild(el('p', {class:'muted'}, [
          'Only the first ' + analysis.summary.rendered + ' words are rendered as cards to keep the browser responsive. ',
          'Use "Render First" to change this limit, or download the analysis JSON for full results.'
        ]));
        outWrap.appendChild(summaryCard);
      }

      if(resultsTitle){
        const resultsCard = el('div', {class:'card' + (modernSimpleLayout ? ' publicSimpleSectionIntro' : '')});
        resultsCard.appendChild(el('h2', {}, [resultsTitle]));
        resultsCard.appendChild(el('p', {class:'muted'}, [
          'Detailed pronunciation output for each rendered word appears below.'
        ]));
        outWrap.appendChild(resultsCard);
      }

      const words = analysis.words || [];
      for(let i=0;i<analysis.summary.rendered;i++) {
        outWrap.appendChild(buildWordCard(words[i], i));
      }
    }

    async function runAnalysisFromText(rawText){
      const parts = tokenizeTextBlockParts(rawText);
      const wordsRaw = [];
      for(const p of parts){
        if(p.type === 'word') wordsRaw.push(p.raw);
      }
      const wordCount = wordsRaw.length;

      const limit = Math.max(1, Number(renderLimitInput.value || prefs.renderLimit || 60));
      prefs.renderLimit = limit;
      saveG2pV4LexiconPrefs(prefs);

      const words = [];
      let segmentCount = 0;
      let missingSegmentCount = 0;
      const uniqueSegs = new Set();
      const chunkSize = 25;

      for(let i=0;i<wordsRaw.length;i++) {
        const w = wordsRaw[i];
        const wo = computeG2pV4Word(w, { trace: traceInput.checked, joinMode: joinSelect.value });
        words.push(wo);

        segmentCount += (wo.segments || []).length;
        for(const r of (wo.rows || [])) {
          uniqueSegs.add(r.segment);
          if(r.status === 'missing') missingSegmentCount += 1;
        }

        if((i+1) % chunkSize === 0) await new Promise(r => setTimeout(r, 0));
      }

      return {
        ts: Date.now(),
        input: rawText,
        words,
        summary: {
          wordCount,
          rendered: Math.min(limit, wordCount),
          segmentCount,
          missingSegmentCount,
          uniqueSegmentCount: uniqueSegs.size
        }
      };
    }

    runBtn.addEventListener('click', async ()=>{
      const rawText = String(input.value || '').trim();
      if(!rawText){
        saveToStorage(draftKey, '');
        renderEmptyState();
        outWrap.appendChild(el('div', {class:'card'}, [el('span', {class:'tag bad'}, ['Empty']), el('span', {class:'muted'}, ['Paste a word or a text block.'])]));
        return;
      }

      runBtn.disabled = true;
      runBtn.textContent = 'Analyzing...';
      outWrap.innerHTML = '';
      outWrap.appendChild(el('div', {class:'card'}, [el('span', {class:'tag'}, ['Working']), el('span', {class:'muted'}, ['Processing words in small batches to avoid freezing the browser.'])]));

      try {
        lastAnalysis = await runAnalysisFromText(rawText);
        renderedCount = lastAnalysis.summary.rendered;
        renderAnalysis(lastAnalysis);
        if(includeAwsControls) generateAwsSsmlFromCurrent();
      } finally {
        runBtn.disabled = false;
        runBtn.textContent = 'Analyze';
      }
    });

    btnClear.addEventListener('click', ()=>{
      input.value = '';
      saveToStorage(draftKey, '');
      lastAnalysis = null;
      renderEmptyState();
      if(includeAwsControls) generateAwsSsmlFromCurrent();
    });

    joinSelect.addEventListener('change', ()=>{
      prefs.joinMode = joinSelect.value;
      saveG2pV4LexiconPrefs(prefs);
      if(lastAnalysis && Array.isArray(lastAnalysis.words)){
        for(const w of lastAnalysis.words){
          w.ipa = joinIpa(w.ipaParts || [], prefs.joinMode);
          w.ssml = buildIpaSsml(w.word || w.wordNorm, w.ipa);
        }
        renderAnalysis(lastAnalysis);
      }
      if(includeAwsControls) generateAwsSsmlFromCurrent();
    });

    btnDownload.addEventListener('click', ()=>{
      if(!lastAnalysis){
        alert('No analysis to download yet.');
        return;
      }
      const stem = 'segmenter_v12_public_demo_analysis_' + new Date(lastAnalysis.ts || Date.now()).toISOString().replaceAll(':','').replaceAll('.','');
      downloadText(stem + '.json', JSON.stringify(lastAnalysis, null, 2), 'application/json');
    });

    fileLoad.addEventListener('change', async (e)=>{
      const f = e.target.files && e.target.files[0];
      if(!f) return;
      const txt = await f.text();
      const parsed = safeJsonParse(txt);
      if(!parsed.ok || !parsed.value) {
        alert('Invalid JSON');
        fileLoad.value = '';
        return;
      }
      const v = parsed.value;
      if(!v || !Array.isArray(v.words) || !v.summary) {
        alert('Not a public demo analysis file.');
        fileLoad.value = '';
        return;
      }
      lastAnalysis = v;
      input.value = String(v.input || '');
      saveToStorage(draftKey, input.value);
      for(const w of lastAnalysis.words){
        w.ipa = joinIpa(w.ipaParts || [], joinSelect.value);
        w.ssml = buildIpaSsml(w.word || w.wordNorm, w.ipa);
      }
      renderAnalysis(lastAnalysis);
      if(includeAwsControls) generateAwsSsmlFromCurrent();
      fileLoad.value = '';
    });

    input.addEventListener('input', ()=>{
      saveToStorage(draftKey, input.value);
    });

    if(includeAwsControls){
      updateAwsControlVisibility();
      btnGenerateSsml.addEventListener('click', ()=>{ generateAwsSsmlFromCurrent(); });

      modeSelect.addEventListener('change', ()=>{
        saveAwsControlPrefs();
        lastAnalysis = null;
        renderEmptyState();
        generateAwsSsmlFromCurrent();
      });

      outputModeSelect.addEventListener('change', ()=>{
        updateAwsControlVisibility();
        generateAwsSsmlFromCurrent();
      });

      for(const control of [speakInput, emptyBodyInput, punctInput, trimNonFinalHInput, removeLowerArticulationInput, strictInput]){
        control.addEventListener('change', ()=>{ generateAwsSsmlFromCurrent(); });
      }

      hyphenInput.addEventListener('change', ()=>{
        saveAwsControlPrefs();
        lastAnalysis = null;
        renderEmptyState();
        generateAwsSsmlFromCurrent();
      });

      autoThr.addEventListener('input', ()=>{
        autoThrLabel.textContent = 'Token threshold: ' + Math.round(parseFloat(autoThr.value || '0.75') * 100) + '%';
        generateAwsSsmlFromCurrent();
      });

      autoDebugInput.addEventListener('change', ()=>{
        saveAwsControlPrefs();
        renderAutoDetectPreview(String(input.value || ''));
      });
    }

    renderEmptyState();
  }

  function renderPublicDemoTab(){
    renderPublicDemoTabVariant({
      rootId: 'pagePublicDemo',
      title: 'Public Demo',
      inputId: 'publicDemoInput',
      idPrefix: 'publicDemo',
      draftKey: 'reorite_segmenter_v12_public_demo_draft'
    });
  }

  function renderPublicDemoSimpleTab(){
    renderPublicDemoTabVariant({
      rootId: 'pagePublicDemoSimple',
      title: 'Public Demo Simple',
      inputId: 'publicDemoSimpleInput',
      idPrefix: 'publicDemoSimple',
      draftKey: 'reorite_segmenter_v12_public_demo_simple_draft',
      showExamples: false,
      showSummary: false,
      resultsTitle: 'Pronunciation Breakdown',
      singleColumnDetails: true,
      collapsibleSegmentMapping: true,
      modernSimpleLayout: true,
      includeAwsControls: true,
      includeAwsPlayback: true
    });
  }
