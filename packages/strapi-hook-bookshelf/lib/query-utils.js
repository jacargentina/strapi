const _ = require('lodash');

class QueryBuilder {
  constructor() {
    this.buildQueryJoins = this.buildQueryJoins.bind(this);
    this.buildQueryFilter = this.buildQueryFilter.bind(this);
  }

  getAssociationFromFieldKey(strapiModel, fieldKey) {
    const parts = fieldKey.split('.');
    let model = strapiModel;
    let association;
    _.forEach(parts, (key) => {
      const attribute = model.attributes[key];
      if (!attribute) {
        association = model.associations.find(a => a.alias === key);
        if (association) {
          const { models } = strapi.plugins[association.plugin] || strapi;
          model = models[association.model || association.collection];
        }
      }
    });

    return {
      association,
      model
    };
  }

  buildQueryJoins(qb) {
    const memo =  [];
    /**
     * Function that has the same behavior as knex innerJoin but it ignores joins that exists already
     */
    const innerJoin = (qb, ...args) => {
      const joinAlreadyExists = _.find(memo, join => _.isEqual(join, args));
      if (!joinAlreadyExists) {
        memo.push(args);
        qb.innerJoin(...args);
      }
    };

    /**
     * Recursive function that generates the join between models depending on the filter
     */
    return (strapiModel, filters) => {
      if (!filters) {
        return undefined;
      }

      _.forEach(filters, (value, key) => {
        const { association, model } = this.getAssociationFromFieldKey(strapiModel, key);

        if (association) {
          const relationTable = model.collectionName;

          qb.distinct();

          if (association.nature === 'manyToMany') {
            // Join on both ends
            innerJoin(
              qb,
              association.tableCollectionName,
              `${association.tableCollectionName}.${strapiModel.info.name}_${strapiModel.primaryKey}`,
              `${strapiModel.collectionName}.${strapiModel.primaryKey}`,
            );

            innerJoin(
              qb,
              relationTable,
              `${association.tableCollectionName}.${strapiModel.attributes[key].attribute}_${strapiModel.attributes[key].column}`,
              `${relationTable}.${model.primaryKey}`,
            );
          } else {
            const externalKey = association.type === 'collection'
              ? `${relationTable}.${association.via}`
              : `${relationTable}.${model.primaryKey}`;

            const internalKey = association.type === 'collection'
              ? `${strapiModel.collectionName}.${strapiModel.primaryKey}`
              : `${strapiModel.collectionName}.${association.alias}`;

            innerJoin(qb, relationTable, externalKey, internalKey);
          }
        }
      });
    };
  }

  buildQueryFilter(qb) {
    return (strapiModel, filters) => {
      _.forEach(filters, (value, key) => {
        const { association, model } = this.getAssociationFromFieldKey(strapiModel, key);
        let fieldKey = `${model.collectionName}.${key}`;
        if (association && association.nature === 'manyToMany') {
          const { attribute, column } = model.attributes[key];
          fieldKey = `${association.tableCollectionName}.${attribute}_${column}`;
        }

        if (value.symbol) {
          qb[value.method](fieldKey, value.symbol, value.value);
        } else if (!_.isUndefined(value.value)) {
          qb[value.method](fieldKey, value.value);
        } else {
          qb[value.method](fieldKey);
        }
      });
    };
  }
}

module.exports = new QueryBuilder();
