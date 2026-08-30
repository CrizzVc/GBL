import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import storeRoutes from './routes/store.js';
import steamgridRoutes from './routes/steamgrid.js';

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json());
app.use('/api/store', storeRoutes);
app.use('/api/steamgrid', steamgridRoutes);

app.listen(PORT, () => {
  console.log(`[GBL Backend] API running on http://localhost:${PORT}`);
});
