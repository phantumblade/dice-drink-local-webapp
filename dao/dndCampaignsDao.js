const openDb = require('../db');

class DndCampaignsDao {
    constructor() {
        this.db = null;
    }

    async init() {
        if (!this.db) {
            this.db = await openDb();
        }
        return this.db;
    }

    async getCampaignDetails(tournamentId) {
        const db = await this.init();
        
        try {
            const campaign = await db.get(`
                SELECT dc.*, t.title as tournament_title
                FROM dnd_campaigns dc
                JOIN tournaments t ON dc.tournament_id = t.id
                WHERE dc.tournament_id = ?
            `, [tournamentId]);

            if (!campaign) {
                return null;
            }

            // Parse JSON fields
            if (campaign.tags) {
                try {
                    campaign.tags = JSON.parse(campaign.tags);
                } catch (e) {
                    campaign.tags = [];
                }
            }

            if (campaign.allowed_classes) {
                try {
                    campaign.allowed_classes = JSON.parse(campaign.allowed_classes);
                } catch (e) {
                    campaign.allowed_classes = [];
                }
            }

            if (campaign.safety_tools) {
                try {
                    campaign.safety_tools = JSON.parse(campaign.safety_tools);
                } catch (e) {
                    campaign.safety_tools = [];
                }
            }

            // Get characters for this campaign
            const characters = await this.getCampaignCharacters(tournamentId);
            campaign.characters = characters;

            return campaign;
        } catch (error) {
            console.error('Error getting campaign details:', error);
            throw error;
        }
    }

    async getCampaignCharacters(tournamentId) {
        const db = await this.init();
        
        try {
            const characters = await db.all(`
                SELECT dc.*, u.first_name, u.last_name, u.email
                FROM dnd_characters dc
                LEFT JOIN users u ON dc.user_id = u.id
                WHERE dc.tournament_id = ?
                ORDER BY dc.is_party_leader DESC, dc.name ASC
            `, [tournamentId]);

            return characters.map(char => {
                // Parse JSON fields
                if (char.stats) {
                    try {
                        char.stats = JSON.parse(char.stats);
                    } catch (e) {
                        char.stats = {};
                    }
                }

                if (char.equipment) {
                    try {
                        char.equipment = JSON.parse(char.equipment);
                    } catch (e) {
                        char.equipment = [];
                    }
                }

                if (char.spells) {
                    try {
                        char.spells = JSON.parse(char.spells);
                    } catch (e) {
                        char.spells = [];
                    }
                }

                return char;
            });
        } catch (error) {
            console.error('Error getting campaign characters:', error);
            throw error;
        }
    }

    async getCharacterDetails(characterId) {
        const db = await this.init();
        
        try {
            const character = await db.get(`
                SELECT dc.*, u.first_name, u.last_name, u.email, t.title as tournament_title
                FROM dnd_characters dc
                LEFT JOIN users u ON dc.user_id = u.id
                JOIN tournaments t ON dc.tournament_id = t.id
                WHERE dc.id = ?
            `, [characterId]);

            if (!character) {
                return null;
            }

            // Parse JSON fields
            if (character.stats) {
                try {
                    character.stats = JSON.parse(character.stats);
                } catch (e) {
                    character.stats = {};
                }
            }

            if (character.equipment) {
                try {
                    character.equipment = JSON.parse(character.equipment);
                } catch (e) {
                    character.equipment = [];
                }
            }

            if (character.spells) {
                try {
                    character.spells = JSON.parse(character.spells);
                } catch (e) {
                    character.spells = [];
                }
            }

            return character;
        } catch (error) {
            console.error('Error getting character details:', error);
            throw error;
        }
    }

    async findCharacterByName(tournamentId, characterName) {
        const db = await this.init();
        
        try {
            const character = await db.get(`
                SELECT dc.*, u.first_name, u.last_name, u.email
                FROM dnd_characters dc
                LEFT JOIN users u ON dc.user_id = u.id
                WHERE dc.tournament_id = ? AND LOWER(dc.name) = LOWER(?)
            `, [tournamentId, characterName]);

            if (!character) {
                return null;
            }

            // Parse JSON fields
            if (character.stats) {
                try {
                    character.stats = JSON.parse(character.stats);
                } catch (e) {
                    character.stats = {};
                }
            }

            return character;
        } catch (error) {
            console.error('Error finding character by name:', error);
            throw error;
        }
    }

    async createCharacter(characterData) {
        const db = await this.init();
        
        try {
            const result = await db.run(`
                INSERT INTO dnd_characters (
                    tournament_id, user_id, name, class, race, level, role, 
                    is_party_leader, background, alignment, description, personality, 
                    ideals, bonds, flaws, backstory, avatar_image, stats, equipment, 
                    spells, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                characterData.tournament_id,
                characterData.user_id,
                characterData.name,
                characterData.class,
                characterData.race,
                characterData.level || 1,
                characterData.role,
                characterData.is_party_leader || 0,
                characterData.background,
                characterData.alignment,
                characterData.description,
                characterData.personality,
                characterData.ideals,
                characterData.bonds,
                characterData.flaws,
                characterData.backstory,
                characterData.avatar_image,
                characterData.stats ? JSON.stringify(characterData.stats) : null,
                characterData.equipment ? JSON.stringify(characterData.equipment) : null,
                characterData.spells ? JSON.stringify(characterData.spells) : null,
                new Date().toISOString(),
                new Date().toISOString()
            ]);

            return { id: result.lastID, ...characterData };
        } catch (error) {
            console.error('Error creating character:', error);
            throw error;
        }
    }
}

module.exports = new DndCampaignsDao();