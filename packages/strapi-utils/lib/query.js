
class Query {
  constructor(model) {
    this.model = model;
    const hook = strapi.hook[this.model.orm];
    const ORMQuery = hook.load().Query;
    this.instance = new ORMQuery(this.model);
  }

  find(filter) {
    return this.instance.find(filter);
  }

  count(filter) {
    return this.instance.count(filter);
  }

  populate(populate) {
    return this.instance.populate(populate);
  }

  execute() {
    return this.instance.execute();
  }
}

module.exports = {
  Query
};
