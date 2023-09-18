import {
  ConnectionOptionsReader,
  DataSource as TODataSource,
  DataSourceOptions,
} from 'typeorm'
import { printError } from './utils/log.util'


const createTypeOrmConnection = (options: DataSourceOptions) => {
  const ds = new TODataSource(options);
  return ds.initialize();
}


interface SeedingOptions {
  factories: string[]
  seeds: string[]
  seedsTableName: string
  cli?: {
    seedsDir?: string
  }
}

export declare type ConnectionOptions = DataSourceOptions & SeedingOptions
export class DataSource extends TODataSource {
  declare options: ConnectionOptions
}

export interface ConfigureOption {
  root?: string
  configName?: string
  connection?: string
}

const KEY = 'TypeORM_Seeding_Connection'

const defaultConfigureOption: ConfigureOption = {
  root: process.cwd(),
  configName: '',
  connection: '',
}

if ((global as any)[KEY] === undefined) {
  ;(global as any)[KEY] = {
    configureOption: defaultConfigureOption,
    ormConfig: undefined,
    connection: undefined,
    overrideConnectionOptions: {},
  }
}

export const configureConnection = (option: ConfigureOption = {}) => {
  ;(global as any)[KEY].configureOption = {
    ...defaultConfigureOption,
    ...option,
  }
}

export const setConnectionOptions = (options: Partial<DataSourceOptions>): void => {
  ;(global as any)[KEY].overrideConnectionOptions = options
}

export const getConnectionOptions = async (): Promise<ConnectionOptions> => {
  const ormConfig = (global as any)[KEY].ormConfig
  const overrideConnectionOptions = (global as any)[KEY].overrideConnectionOptions
  if (ormConfig === undefined) {
    const configureOption = (global as any)[KEY].configureOption
    const connection = configureOption.connection
    const reader = new ConnectionOptionsReader({
      root: configureOption.root,
      configName: configureOption.configName,
    })
    let o = (await reader.all() as unknown as Array<{dataSource: DataSource, baseDirectory: string}>)
    let options = o.map(option => option.dataSource || option) as Array<DataSource | ConnectionOptions>

    if (connection !== undefined && connection !== '') {
      const filteredOptions = options.filter((o) => o.name === connection)
      if (filteredOptions.length === 1) {
        options = filteredOptions
      }
    }
    if (options.length > 1) {
      const filteredOptions = options.filter((o) => o.name === 'default')
      if (filteredOptions.length === 1) {
        options = filteredOptions
      }
    }
    if (options.length === 1) {
      const option = (options[0] as DataSource)?.options ?? options[0] as ConnectionOptions;

      if (!option.factories) {
        option.factories = [process.env.TYPEORM_SEEDING_FACTORIES || 'src/database/factories/**/*{.ts,.js}']
      }
      if (!option.seeds) {
        option.seeds = [process.env.TYPEORM_SEEDING_SEEDS || 'src/database/seeds/**/*{.ts,.js}']
      }
      ;(global as any)[KEY].ormConfig = {
        ...option,
        ...overrideConnectionOptions,
      }
      return (global as any)[KEY].ormConfig
    }
    printError('There are multiple connections please provide a connection name')
  }
  return ormConfig
}

export const createConnection = async (option?: DataSourceOptions): Promise<DataSource> => {
  const configureOption = (global as any)[KEY].configureOption
  let connection = (global as any)[KEY].connection
  let ormConfig = (global as any)[KEY].ormConfig

  if (option !== undefined) {
    ormConfig = option
  }

  if (connection === undefined) {
      connection = await createTypeOrmConnection(ormConfig);
    (global as any)[KEY].connection = connection
  }
  return connection
}
