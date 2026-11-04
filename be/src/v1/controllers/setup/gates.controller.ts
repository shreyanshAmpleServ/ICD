import { Request, Response } from 'express';
import { setupService } from '../../../modules/setup/setup.service';

export const setupGatesController = {
    getGates: async (req: Request, res: Response) => {
      try {
        const siteId = req.query.siteId ? Number(req.query.siteId) : undefined;
        const items = await setupService.getGates(siteId);
        res.json({ items, total: items.length, nextCursor: null });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    },

      getGateById: async (req: Request, res: Response) => {
        try {
          const gate = await setupService.getGateById(req.params.gateId);
          if (!gate) return res.status(404).json({ error: 'Gate not found' });
          res.json(gate);
        } catch (err: any) {
          res.status(500).json({ error: err.message });
        }
      },

        createGate: async (req: Request, res: Response) => {
          try {
            const created = await setupService.createGate(req.body);
            res.status(201).json(created);
          } catch (err: any) {
            res.status(500).json({ error: err.message });
          }
        },

          updateGate: async (req: Request, res: Response) => {
            try {
              const updated = await setupService.updateGate(Number(req.params.gateId), req.body);
              res.json(updated);
            } catch (err: any) {
              res.status(500).json({ error: err.message });
            }
          },

            deleteGate: async (req: Request, res: Response) => {
              try {
                const result = await setupService.deleteGate(Number(req.params.gateId));
                res.json(result);
              } catch (err: any) {
                res.status(500).json({ error: err.message });
              }
            },

              createLane: async (req: Request, res: Response) => {
                try {
                  const created = await setupService.createLane(Number(req.params.gateId), req.body);
                  res.status(201).json(created);
                } catch (err: any) {
                  res.status(500).json({ error: err.message });
                }
              },

                updateLane: async (req: Request, res: Response) => {
                  try {
                    const updated = await setupService.updateLane(Number(req.params.laneId), req.body);
                    res.json(updated);
                  } catch (err: any) {
                    res.status(500).json({ error: err.message });
                  }
                },

                  deleteLane: async (req: Request, res: Response) => {
                    try {
                      const result = await setupService.deleteLane(Number(req.params.laneId));
                      res.json(result);
                    } catch (err: any) {
                      res.status(500).json({ error: err.message });
                    }
                  },

                    getCheckpoints: async (_req: Request, res: Response) => {
                      try {
                        const items = await setupService.getCheckpoints();
                        res.json({ items, total: items.length, nextCursor: null });
                      } catch (err: any) {
                        res.status(500).json({ error: err.message });
                      }
                    },

                      getCheckpointById: async (req: Request, res: Response) => {
                        try {
                          const cp = await setupService.getCheckpointById(req.params.checkpointId);
                          if (!cp) return res.status(404).json({ error: 'Checkpoint not found' });
                          res.json(cp);
                        } catch (err: any) {
                          res.status(500).json({ error: err.message });
                        }
                      },

                        createCheckpoint: async (req: Request, res: Response) => {
                          try {
                            const created = await setupService.createCheckpoint(req.body);
                            res.status(201).json(created);
                          } catch (err: any) {
                            res.status(500).json({ error: err.message });
                          }
                        },

                          updateCheckpoint: async (req: Request, res: Response) => {
                            try {
                              const updated = await setupService.updateCheckpoint(Number(req.params.checkpointId), req.body);
                              res.json(updated);
                            } catch (err: any) {
                              res.status(500).json({ error: err.message });
                            }
                          },

                            deleteCheckpoint: async (req: Request, res: Response) => {
                              try {
                                const result = await setupService.deleteCheckpoint(Number(req.params.checkpointId));
                                res.json(result);
                              } catch (err: any) {
                                res.status(500).json({ error: err.message });
                              }
                            },

                              getVisitTypes: async (_req: Request, res: Response) => {
                                try {
                                  const items = await setupService.getVisitTypes();
                                  res.json({ items, total: items.length, nextCursor: null });
                                } catch (err: any) {
                                  res.status(500).json({ error: err.message });
                                }
                              },

                                getVisitTypeById: async (req: Request, res: Response) => {
                                  try {
                                    const vt = await setupService.getVisitTypeById(req.params.visitTypeId);
                                    if (!vt) return res.status(404).json({ error: 'Visit type not found' });
                                    res.json(vt);
                                  } catch (err: any) {
                                    res.status(500).json({ error: err.message });
                                  }
                                },

                                  createVisitType: async (req: Request, res: Response) => {
                                    try {
                                      const created = await setupService.createVisitType(req.body);
                                      res.status(201).json(created);
                                    } catch (err: any) {
                                      res.status(500).json({ error: err.message });
                                    }
                                  },

                                    updateVisitType: async (req: Request, res: Response) => {
                                      try {
                                        const updated = await setupService.updateVisitType(Number(req.params.visitTypeId), req.body);
                                        res.json(updated);
                                      } catch (err: any) {
                                        res.status(500).json({ error: err.message });
                                      }
                                    },

                                      deleteVisitType: async (req: Request, res: Response) => {
                                        try {
                                          const result = await setupService.deleteVisitType(Number(req.params.visitTypeId));
                                          res.json(result);
                                        } catch (err: any) {
                                          res.status(500).json({ error: err.message });
                                        }
                                      },
};
