import { usePublishStore } from '../state/publishes';
import { Service } from '../types/interfaces/resources';

export const useAllResourceStatus = () =>
  usePublishStore((state) =>
    Object.entries(state.resourceStatus)
      .filter(([_, status]) => status !== null)
      .map(([id, status]) => {
        const parts = id.split('-');
        const service = parts[0] as Service;
        const name = parts[1] || '';
        const identifier = parts.length > 2 ? parts.slice(2).join('-') : '';
        const { path, filename, ...rest } = status!;

        return {
          id,
          metadata: { service, name, identifier },
          status: rest,
          path,
          filename,
        };
      })
  );
