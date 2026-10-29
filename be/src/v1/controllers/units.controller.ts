import { Request, Response } from 'express';
import { unitsService } from '../services/units.service';
import { parsePaginationParams } from '../../utils';

export class UnitsController {
  public getUnitTypes = async (req: Request, res: Response) => {
    const params = parsePaginationParams(req.query);
    const result = await unitsService.getUnitTypes(params);
    res.json(result);
  };

  public createUnitType = async (req: Request, res: Response) => {
    const result = await unitsService.createUnitType(req.body);
    res.status(201).json(result);
  };

  public getUnitTypeById = async (req: Request, res: Response) => {
    const result = await unitsService.getUnitTypeById(req.params.unitTypeId);
    res.json(result);
  };

  public updateUnitType = async (req: Request, res: Response) => {
    const result = await unitsService.updateUnitType(req.params.unitTypeId, req.body);
    res.json(result);
  };

  public getIdentityRules = async (req: Request, res: Response) => {
    const params = parsePaginationParams(req.query);
    const result = await unitsService.getIdentityRules(params);
    res.json(result);
  };

  public validateIdentity = async (req: Request, res: Response) => {
    const { category, rawValue } = req.body;
    const result = unitsService.validateIdentity(category, rawValue);
    res.json(result);
  };

  public getPlateFormats = async (req: Request, res: Response) => {
    const params = parsePaginationParams(req.query);
    const result = await unitsService.getPlateFormats(params);
    res.json(result);
  };

  public search = async (req: Request, res: Response) => {
    const q = String(req.query.q || '').trim();
    const result = unitsService.searchGlobal(q);
    res.json(result);
  };

  public getUnits = async (req: Request, res: Response) => {
    const { category, status, customsStatus, location, search: searchQ } = req.query;
    const params = parsePaginationParams(req.query);
    const result = await unitsService.getUnits(
      { category, status, customsStatus, location, search: searchQ },
      params
    );
    res.json(result);
  };

  public createUnit = async (req: Request, res: Response) => {
    const result = await unitsService.createUnitStay(req.body);
    res.status(201).json(result);
  };

  public getUnitById = async (req: Request, res: Response) => {
    const result = await unitsService.getUnitStayById(req.params.unitStayId);
    res.json(result);
  };

  public updateUnit = async (req: Request, res: Response) => {
    const result = await unitsService.updateUnitStay(req.params.unitStayId, req.body);
    res.json(result);
  };

  public getUnitTimeline = async (req: Request, res: Response) => {
    const result = await unitsService.getUnitTimeline(req.params.unitStayId);
    res.json(result);
  };

  public getUnitHolds = async (req: Request, res: Response) => {
    const params = parsePaginationParams(req.query);
    const result = await unitsService.getUnitHolds(req.params.unitStayId, params);
    res.json(result);
  };

  public getUnitHistory = async (req: Request, res: Response) => {
    const result = await unitsService.getUnitHistory(req.params.unitStayId);
    res.json(result);
  };
}

export const unitsController = new UnitsController();

