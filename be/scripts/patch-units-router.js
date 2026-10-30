const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/modules/units/units.router.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Ensure import exists
if (!content.includes('import { cargoService } from "../cargo/cargo.service";')) {
  content = content.replace(
    'import { getPrisma, isDbLive } from "../../db/prisma";',
    'import { getPrisma, isDbLive } from "../../db/prisma";\nimport { cargoService } from "../cargo/cargo.service";'
  );
}

// Replace everything from router.get("/units", ...) to the end of the file
const startToken = 'router.get(\n  "/units",';
const startTokenCRLF = 'router.get(\r\n  "/units",';
let startIndex = content.indexOf(startToken);
if (startIndex === -1) {
  startIndex = content.indexOf(startTokenCRLF);
}

if (startIndex !== -1) {
  const replacement = `router.get(
  "/units",
  requireSite(false),
  requirePermission("consignment.view"),
  asyncHandler(async (req, res) => {
    const items = await cargoService.getUnits(req.query);
    const paginationParams = parsePaginationParams(req.query);
    const paginated = paginateArray(
      items,
      paginationParams,
      (s) => s.unitStayId,
    );
    res.json(paginated);
  }),
);

router.post(
  "/units",
  requireSite(false),
  requirePermission("consignment.edit", "DO"),
  asyncHandler(async (req, res) => {
    const newStay = await cargoService.createUnit(req.body);
    res.status(201).json(newStay);
  }),
);

router.get(
  "/units/:unitStayId",
  requireSite(false),
  requirePermission("consignment.view"),
  asyncHandler(async (req, res) => {
    const stay = await cargoService.getUnit(req.params.unitStayId);
    if (!stay) {
      throw new NotFoundError("Unit stay", req.params.unitStayId);
    }
    res.json(stay);
  }),
);

router.patch(
  "/units/:unitStayId",
  requireSite(false),
  requirePermission("consignment.edit", "DO"),
  asyncHandler(async (req, res) => {
    const stay = await cargoService.updateUnit(req.params.unitStayId, req.body);
    if (!stay) {
      throw new NotFoundError("Unit stay", req.params.unitStayId);
    }
    res.json(stay);
  }),
);

router.get(
  "/units/:unitStayId/timeline",
  requireSite(false),
  requirePermission("consignment.view"),
  asyncHandler(async (req, res) => {
    const timeline = await cargoService.getUnitTimeline(req.params.unitStayId);
    if (!timeline) {
      throw new NotFoundError("Unit stay", req.params.unitStayId);
    }
    res.json(timeline);
  }),
);

router.get(
  "/cargo-units/:cargoUnitId/stays",
  requireSite(false),
  requirePermission("consignment.view"),
  (req, res) => {
    const stays = allStays.filter(
      (s) => String(s.cargoUnit?.cargoUnitId) === req.params.cargoUnitId,
    );
    const params = parsePaginationParams(req.query);
    const paginated = paginateArray(stays, params, (s) => s.unitStayId);
    res.json(paginated);
  },
);

router.get(
  "/units/:unitStayId/holds",
  requireSite(false),
  requirePermission("consignment.view"),
  asyncHandler(async (req, res) => {
    const holds = await cargoService.getHolds({ unitStayId: req.params.unitStayId });
    const params = parsePaginationParams(req.query);
    const paginated = paginateArray(holds, params);
    res.json(paginated);
  }),
);

router.get(
  "/units/:unitStayId/history",
  requireSite(false),
  requirePermission("consignment.view"),
  asyncHandler(async (req, res) => {
    const stay = await cargoService.getUnit(req.params.unitStayId);
    if (!stay) {
      throw new NotFoundError("Unit stay", req.params.unitStayId);
    }
    res.json({
      unitStayId: stay.unitStayId,
      unitNo: stay.cargoUnit?.unitNo,
      moves: [
        {
          fromLocation: "GATE_IN_LANE_1",
          toLocation: stay.currentLocation?.fullCode || "A-02-04-2",
          movedAt: stay.gatedInAt,
          movedBy: "Ibrahim N.",
        },
      ],
    });
  }),
);

export const unitsRouter = router;
`;
  content = content.substring(0, startIndex) + replacement;
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully patched units.router.ts');
} else {
  console.error('Could not find start token in units.router.ts');
}

