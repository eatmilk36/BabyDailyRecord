// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_heavy_victor_mancha.sql';
import m0001 from './0001_flippant_eternals.sql';
import m0002 from './0002_daffy_jack_murdock.sql';

  export default {
    journal,
    migrations: {
      m0000,
m0001,
m0002
    }
  }
  