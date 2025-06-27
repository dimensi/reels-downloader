import { Router } from 'express';
import downloadRoutes from './download';

const router = Router();

// Подключаем маршруты
router.use('/download', downloadRoutes);

export default router;
