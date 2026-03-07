const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const JsonStore = require('../utils/jsonStore');

const materialDB = new JsonStore('raw-materials');
const typeDB = new JsonStore('product-types');

// GET ALL TYPES (Frontend: rawMaterialAPI.getAll)
router.get('/', auth, async (req, res) => {
    try {
        const types = await typeDB.find({ userId: req.user.id, isDeleted: false });
        const materials = await materialDB.find({ userId: req.user.id, isDeleted: false });

        // Nest materials inside types for the frontend
        const result = types.map(type => ({
            ...type,
            materials: materials.filter(m => m.productTypeId === type._id)
        }));

        result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(result);
    } catch (err) {
        console.error("RAW_MATERIALS_GET_ALL ERROR:", err);
        res.status(500).json({ message: 'Error fetching product types', error: err.message });
    }
});

// CREATE PRODUCT TYPE (Frontend: rawMaterialAPI.createProductType)
router.post('/', auth, async (req, res) => {
    try {
        console.log("CREATE PRODUCT TYPE REQUEST BODY:", JSON.stringify(req.body, null, 2));
        const { name, productName } = req.body;
        const displayName = (name || productName || '').trim();

        if (!displayName) {
            console.warn("VALIDATION FAILED FOR PRODUCT TYPE: Name is empty.");
            return res.status(400).json({ message: 'Product type name is required' });
        }

        const type = await typeDB.create({
            name: displayName.toUpperCase(),
            productName: displayName.toUpperCase(), // support both
            userId: req.user.id,
            isDeleted: false,
            createdAt: new Date().toISOString()
        });
        console.log("PRODUCT TYPE CREATED SUCCESSFULLY:", type._id);
        res.status(201).json(type);
    } catch (err) {
        console.error("RAW_MATERIALS_TYPE_CREATE ERROR:", err);
        res.status(400).json({ message: 'Error adding type', error: err.message });
    }
});

// ADD MATERIAL TO TYPE (Frontend: rawMaterialAPI.addMaterial)
router.post('/:typeId/materials', auth, async (req, res) => {
    try {
        console.log(`ADD MATERIAL REQUEST FOR TYPE ${req.params.typeId}:`, JSON.stringify(req.body, null, 2));
        const { name, cost, qty, unit } = req.body;

        const matCost = (cost !== undefined && cost !== "") ? Number(cost) : NaN;
        const matQty = (qty !== undefined && qty !== "") ? Number(qty) : 0; // default qty to 0 if not provided

        if (!name || isNaN(matCost)) {
            console.warn("VALIDATION FAILED FOR MATERIAL:", { name, cost, qty });
            return res.status(400).json({ message: 'Material name and cost are required' });
        }

        const material = await materialDB.create({
            name: name.toUpperCase(),
            cost: matCost,
            qty: matQty,
            unit: unit || 'PCS',
            total: (matCost * matQty),
            productTypeId: req.params.typeId,
            userId: req.user.id,
            isDeleted: false
        });
        console.log("MATERIAL ADDED:", material._id);
        res.status(201).json(material);
    } catch (err) {
        console.error("RAW_MATERIAL_ADD ERROR:", err);
        res.status(400).json({ message: 'Error adding material', error: err.message });
    }
});

// UPDATE MATERIAL (Frontend: rawMaterialAPI.updateMaterial)
router.put('/:typeId/materials/:matId', auth, async (req, res) => {
    try {
        console.log(`UPDATE MATERIAL REQUEST FOR ${req.params.matId}:`, req.body);
        const material = await materialDB.findOneAndUpdate(
            { _id: req.params.matId, userId: req.user.id, productTypeId: req.params.typeId },
            {
                ...req.body,
                cost: Number(req.body.cost || 0),
                qty: Number(req.body.qty || 0),
                total: (Number(req.body.cost || 0) * Number(req.body.qty || 0))
            }
        );
        if (!material) return res.status(404).json({ message: 'Material not found' });
        res.json(material);
    } catch (err) {
        console.error("MATERIAL UPDATE ERROR:", err);
        res.status(400).json({ message: 'Error updating material', error: err.message });
    }
});

// DELETE MATERIAL (Frontend: rawMaterialAPI.deleteMaterial)
router.delete('/:typeId/materials/:matId', auth, async (req, res) => {
    try {
        console.log(`DELETE MATERIAL REQUEST FOR ${req.params.matId}`);
        const result = await materialDB.deleteOne({ _id: req.params.matId, userId: req.user.id, productTypeId: req.params.typeId });
        if (!result.deletedCount) return res.status(404).json({ message: 'Material not found' });
        res.json({ message: 'Material removed' });
    } catch (err) {
        console.error("MATERIAL DELETE ERROR:", err);
        res.status(500).json({ message: 'Error deleting material', error: err.message });
    }
});

// DELETE PRODUCT TYPE (Frontend: rawMaterialAPI.deleteProductType)
router.delete('/:id', auth, async (req, res) => {
    try {
        console.log(`DELETE PRODUCT TYPE REQUEST FOR ${req.params.id}`);
        const type = await typeDB.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id, isDeleted: false },
            { isDeleted: true, deletedAt: new Date().toISOString() }
        );
        if (!type) {
            // Check if it's a direct material delete (fallback)
            const result = await materialDB.deleteOne({ _id: req.params.id, userId: req.user.id });
            if (!result.deletedCount) return res.status(404).json({ message: 'Record not found' });
            return res.json({ message: 'Material removed' });
        }

        // Also soft-delete all materials for this type
        const mats = await materialDB.updateMany(
            { productTypeId: req.params.id, userId: req.user.id },
            { isDeleted: true, deletedAt: new Date().toISOString() }
        );

        res.json({ message: 'Product type and its materials moved to trash' });
    } catch (err) {
        console.error("PRODUCT TYPE DELETE ERROR:", err);
        res.status(500).json({ message: 'Error deleting record', error: err.message });
    }
});

module.exports = router;
