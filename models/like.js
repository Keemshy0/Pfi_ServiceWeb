import Model from './model.js';

export default class Like extends Model {
    constructor() {
        super(true /* secured Id */);

        this.addField('IdUser', 'string');
        this.addField('IdPost', 'string');

        this.setKey("Id");
    }
}