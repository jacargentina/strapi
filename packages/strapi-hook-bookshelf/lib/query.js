const { has, isEmpty } = require('lodash');
const { buildQueryJoins, buildQueryFilter } = require('./query-utils');

class Query {
  constructor(model) {
    this.model = model;
    this.query = this.model.query();
  }

  buildQuery(filter) {
    // Generate stages.
    buildQueryJoins(this.query)(this.model, filter.where);
    buildQueryFilter(this.query)(this.model, filter.where);
  }

  find(filter, withRelated = []) {
    this.buildQuery(filter);

    if (has(filter, 'start')) this.query.offset(filter.start);
    if (has(filter, 'limit')) this.query.limit(filter.limit);
    if (!isEmpty(filter.sort)) {
      this.query.orderBy(filter.sort.key, filter.sort.order);
    }

    this.query = this.model
      .query(function(qb) { // eslint-disable-line no-unused-vars
        qb = this.query;
      })
      .fetchAll(
        { withRelated }
      );

    return this;
  }

  count(filter) {
    this.buildQuery(filter);
    this.query = this.model
      .query(function(qb) { // eslint-disable-line no-unused-vars
        qb = this.query;
      })
      .count();
    return this;
  }

  execute() {
    return this.query;
  }
}

module.exports = {
  Query,
};
